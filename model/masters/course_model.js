const db = require("../../DB/knex");

const hasCourseSkillIdColumn = () => db.schema.hasColumn("tg_courses", "skill_id");

const toNullableSkillId = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toNumericId = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeStatus = (value) =>
  value === undefined || value === null || value === ""
    ? undefined
    : Number(value) === 0
      ? 0
      : 1;

const normalizeSkillIds = (payload) => {
  const fromArray = Array.isArray(payload?.skill_ids)
    ? payload.skill_ids
    : [];

  const fromSkillId =
    payload?.skill_id !== undefined && payload?.skill_id !== null && payload?.skill_id !== ""
      ? String(payload.skill_id)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

  const raw = [...fromArray, ...fromSkillId];

  return Array.from(
    new Set(
      raw
        .map((value) => toNullableSkillId(value))
        .filter((value) => value !== null),
    ),
  );
};

const parseStoredSkillIds = (value) => {
  if (value === undefined || value === null || value === "") return [];

  return Array.from(
    new Set(
      String(value)
        .split(",")
        .map((item) => toNullableSkillId(item.trim()))
        .filter((item) => item !== null),
    ),
  );
};

const formatSkillIdCsv = (skillIds) => {
  if (!Array.isArray(skillIds) || skillIds.length === 0) return null;
  return skillIds.join(",");
};

const Course = {

  // GET all with topics + subtopics
  getAllCourses: async (employeeId) => {
    const hasSkillId = await hasCourseSkillIdColumn();

    let coursesQuery = db("tg_courses as c")
      .where("c.is_deleted", 0)
      .orderBy("c.created_date", "desc");

    coursesQuery = coursesQuery.select("c.*");

    const courses = await coursesQuery;

    const allSkillIds = Array.from(
      new Set(
        courses.flatMap((course) =>
          hasSkillId ? parseStoredSkillIds(course.skill_id) : [],
        ),
      ),
    );

    const skills = allSkillIds.length
      ? await db("tg_skills")
          .select("id", "skill_name")
          .whereIn("id", allSkillIds)
      : [];

    const skillNameById = new Map(
      skills.map((item) => [Number(item.id), item.skill_name || ""]),
    );

    let completedSubtopicIdSet = new Set();
    if (employeeId) {
      const progressRows = await db("tg_emp_subtopic_progress")
        .where({ employee_id: employeeId })
        .orderBy("id", "desc");

      // Keep latest row per subtopic_id and map is_completed state.
      const completionBySubtopicId = new Map();
      for (const row of progressRows) {
        if (!completionBySubtopicId.has(row.subtopic_id)) {
          completionBySubtopicId.set(row.subtopic_id, Boolean(row.is_completed));
        }
      }

      completedSubtopicIdSet = new Set(
        Array.from(completionBySubtopicId.entries())
          .filter(([, isCompleted]) => isCompleted)
          .map(([subtopicId]) => Number(subtopicId)),
      );
    }

    for (const c of courses) {
      c.skill_ids = hasSkillId ? parseStoredSkillIds(c.skill_id) : [];
      c.course_skill_names = c.skill_ids
        .map((skillId) => skillNameById.get(Number(skillId)))
        .filter(Boolean);
      c.course_skill_name = c.course_skill_names[0] || "";

      const topics = await db("tg_topics")
        .where({ course_id: c.id, is_deleted: 0 });

      for (const t of topics) {
        const subs = await db("tg_subtopics")
          .where({ topic_id: t.id, is_deleted: 0 });

        t.subtopics = subs.map((sub) => ({
          ...sub,
          completed: completedSubtopicIdSet.has(Number(sub.id)),
        }));

        const hasSubtopics = t.subtopics.length > 0;
        t.completed = hasSubtopics && t.subtopics.every((sub) => Boolean(sub.completed));
      }

      c.topics = topics;

      const allSubtopics = topics.flatMap((topic) => topic.subtopics || []);
      const completedCount = allSubtopics.filter((sub) => Boolean(sub.completed)).length;
      c.progress = allSubtopics.length
        ? Math.round((completedCount / allSubtopics.length) * 100)
        : 0;
    }

    return courses;
  },

  markSubtopicCompleted: async ({ employeeId, subtopicId }) => {
    const normalizedEmployeeId = toNumericId(employeeId);
    const normalizedSubtopicId = toNumericId(subtopicId);

    if (!normalizedEmployeeId || !normalizedSubtopicId) {
      throw new Error("Invalid employee or subtopic id");
    }

    const subtopic = await db("tg_subtopics as st")
      .leftJoin("tg_topics as t", "st.topic_id", "t.id")
      .leftJoin("tg_courses as c", "t.course_id", "c.id")
      .select("st.id as subtopic_id", "t.id as topic_id", "c.id as course_id")
      .where("st.id", normalizedSubtopicId)
      .first();

    if (!subtopic?.subtopic_id || !subtopic?.topic_id || !subtopic?.course_id) {
      throw new Error("Subtopic not found");
    }

    // Find training_id for this employee and course using JS-side filtering (for LONGTEXT columns)
    let trainingId = null;
    const allTrainings = await db('tg_training_list')
      .where('is_deleted', 0);
    const trainings = allTrainings.filter(t => {
      let courseArr = [];
      let empArr = [];
      try { courseArr = JSON.parse(t.courses); } catch { courseArr = []; }
      try { empArr = JSON.parse(t.employees); } catch { empArr = []; }
      return courseArr.includes(subtopic.course_id) && empArr.includes(normalizedEmployeeId);
    });
    if (trainings.length > 0) {
      trainingId = trainings[0].id;
    }

    const existing = await db("tg_emp_subtopic_progress")
      .where({
        employee_id: normalizedEmployeeId,
        subtopic_id: normalizedSubtopicId,
      })
      .orderBy("id", "desc")
      .first();

    const payload = {
      employee_id: normalizedEmployeeId,
      course_id: subtopic.course_id,
      topic_id: subtopic.topic_id,
      subtopic_id: normalizedSubtopicId,
      is_completed: 1,
      completed_at: db.fn.now(),
      updated_date: db.fn.now(),
      training_id: trainingId,
    };

    if (existing?.id) {
      await db("tg_emp_subtopic_progress")
        .where({ id: existing.id })
        .update(payload);
      return { id: existing.id, ...payload };
    }

    const [insertedId] = await db("tg_emp_subtopic_progress").insert({
      ...payload,
      created_date: db.fn.now(),
    });

    return { id: insertedId, ...payload };
  },

  // CREATE
  createCourse: async (data) => {
    const hasSkillId = await hasCourseSkillIdColumn();
    const skillIds = normalizeSkillIds(data);
    const status = normalizeStatus(data?.status);
    const coursePayload = {
      course_code: data.course_code,
      course_name: data.course_name,
      status: status === 0 ? 0 : 1,
      created_by: 1,
    };

    if (hasSkillId) {
      coursePayload.skill_id =
        formatSkillIdCsv(skillIds) ||
        (toNullableSkillId(data.skill_id) !== null
          ? String(toNullableSkillId(data.skill_id))
          : null);
    }

    const [courseId] = await db("tg_courses").insert(coursePayload);

    if (data.topics) {
      for (const t of data.topics) {
        const [topicId] = await db("tg_topics").insert({
          course_id: courseId,
          topic_name: t.topic_name,
          created_by: 1,
        });

        if (t.subtopics) {
          for (const s of t.subtopics) {
            await db("tg_subtopics").insert({
              topic_id: topicId,
              subtopic_name: s.subtopic_name,
              material_link: s.material_link,
              created_by: 1,
            });
          }
        }
      }
    }

    return courseId;
  },

  // UPDATE
  updateCourse: async (id, data) => {
    const hasSkillId = await hasCourseSkillIdColumn();
    const skillIds = normalizeSkillIds(data);
    const status = normalizeStatus(data?.status);
    const updatePayload = {
      course_code: data.course_code,
      course_name: data.course_name,
    };

    if (status !== undefined) {
      updatePayload.status = status === 0 ? 0 : 1;
    }

    if (hasSkillId) {
      updatePayload.skill_id =
        formatSkillIdCsv(skillIds) ||
        (toNullableSkillId(data.skill_id) !== null
          ? String(toNullableSkillId(data.skill_id))
          : null);
    }

    await db("tg_courses")
      .where({ id })
      .update(updatePayload);

    // delete old topics + subtopics
    const topics = await db("tg_topics").where({ course_id: id });
    for (const t of topics) {
      await db("tg_subtopics").where({ topic_id: t.id }).del();
    }
    await db("tg_topics").where({ course_id: id }).del();

    // insert new
    if (data.topics) {
      for (const t of data.topics) {
        const [topicId] = await db("tg_topics").insert({
          course_id: id,
          topic_name: t.topic_name,
        });

        if (t.subtopics) {
          for (const s of t.subtopics) {
            await db("tg_subtopics").insert({
              topic_id: topicId,
              subtopic_name: s.subtopic_name,
              material_link: s.material_link,
            });
          }
        }
      }
    }
  },

  deleteCourse: async (id) => {
    await db("tg_courses")
      .where({ id })
      .update({ is_deleted: 1 });
  },
};

module.exports = Course;
