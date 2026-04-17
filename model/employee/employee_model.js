const db = require("../../DB/knex");

const statusReverseMap = {
  0: 'upcoming',
  1: 'running',
  2: 'completed'
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeSkillName = (value) => String(value || '').trim().toLowerCase();
const normalizeText = (value) => String(value || '').trim().toLowerCase();

const parseDeptIds = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .map((id) => Number(String(id).trim()))
        .filter((id) => Number.isInteger(id) && id > 0)
    )];
  }

  if (value === undefined || value === null || value === '') return [];

  return [...new Set(
    String(value)
      .split(',')
      .map((id) => Number(String(id).trim()))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
};

const hasCourseSkillIdColumn = () => db.schema.hasColumn('tg_courses', 'skill_id');
const hasTrainerIdColumn = () => db.schema.hasColumn('tg_training_list', 'trainer_id');

const toMinutesFromTime = (timeValue) => {
  if (!timeValue) return 0;
  const raw = String(timeValue).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return 0;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
};

const resolveExamResultTableName = async () => {
  const hasPlural = await db.schema.hasTable('tg_exam_results');
  if (hasPlural) return 'tg_exam_results';

  const hasSingular = await db.schema.hasTable('tg_exam_result');
  if (hasSingular) return 'tg_exam_result';

  return null;
};

const getSkillGapMappedCourseIds = async (employeeId) => {
  const user = await db('tg_ad_users')
    .where({ id: employeeId, is_deleted: 0 })
    .first('id', 'emp_id', 'dept_id');

  if (!user) return [];

  const skillGapRows = await db('tg_skillgap')
    .where('is_deleted', 0)
    .andWhere(function () {
      this.where('emp_id', user.id);
      if (user.emp_id !== undefined && user.emp_id !== null && user.emp_id !== '') {
        this.orWhere('emp_id', user.emp_id);
      }
    })
    .select('skills');

  const currentSkills = new Set(
    skillGapRows
      .map((row) => normalizeSkillName(row?.skills))
      .filter(Boolean),
  );

  const userDeptIds = parseDeptIds(user.dept_id);
  if (userDeptIds.length === 0) return [];

  const requiredSkills = await db('tg_skills')
    .whereIn('dept_id', userDeptIds)
    .andWhere('is_deleted', 0)
    .select('id', 'skill_name');

  const missingSkillIds = requiredSkills
    .filter((row) => !currentSkills.has(normalizeSkillName(row.skill_name)))
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id));

  if (missingSkillIds.length === 0) return [];

  const hasSkillId = await hasCourseSkillIdColumn();
  if (!hasSkillId) return [];

  const courseRows = await db('tg_courses')
    .where({ is_deleted: 0 })
    .whereIn('skill_id', missingSkillIds)
    .select('id');

  return courseRows
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id));
};

const Profile = {

  getProfileById: async (id) => {
    const profile = await db("tg_ad_users as u")
      .leftJoin("tg_roles as r", "u.role_id", "r.id")
      .select("u.*", "r.role_name")
      .where("u.id", id)
      .andWhere("u.is_deleted", 0)
      .first();

    if (!profile) return null;

    const deptIds = parseDeptIds(profile.dept_id);
    if (deptIds.length === 0) {
      return {
        ...profile,
        department: '',
        dept_ids: [],
      };
    }

    const departments = await db('tg_department')
      .whereIn('id', deptIds)
      .andWhere('is_deleted', 0)
      .select('id', 'dept_name');

    const deptNameById = {};
    departments.forEach((dept) => {
      deptNameById[Number(dept.id)] = dept.dept_name;
    });

    const orderedDeptNames = deptIds
      .map((deptId) => deptNameById[deptId])
      .filter(Boolean);

    return {
      ...profile,
      department: orderedDeptNames.join(', '),
      dept_ids: deptIds,
    };
  },

  updateProfileById: (id, data) => {
    return db("tg_ad_users")
      .where("id", id)
      .andWhere("is_deleted", 0)
      .update(data);
  },

  getTrainingsByEmployeeId: async (employeeId) => {
    const user = await db('tg_ad_users')
      .where({ id: employeeId, is_deleted: 0 })
      .first('id', 'emp_id', 'name', 'username');

    if (!user) return [];

    const rows = await db("tg_training_list")
      .where({ is_deleted: 0 })
      .select("*")
      .orderBy("created_date", "desc");

    const normalized = rows.map((row) => ({
      ...row,
      status: statusReverseMap[row.status] || 'upcoming',
      courses: parseJsonArray(row.courses),
      employees: parseJsonArray(row.employees),
    }));

    const userId = String(user.id);
    const userEmpId = String(user.emp_id || '');
    const userName = normalizeText(user.name);
    const userUsername = normalizeText(user.username);

    // Only trainings assigned to this employee
    const filteredTrainings = normalized.filter((row) => {
      const employeeAssigned = row.employees.some((id) => {
        const value = String(id || '').trim();
        return value === userId || (userEmpId && value === userEmpId);
      });

      const trainerAssignedById = String(row.trainer_id || '').trim() === userId;
      const trainerName = normalizeText(row.trainer_name);
      const trainerAssignedLegacy = Boolean(
        !trainerAssignedById && !String(row.trainer_id || '').trim() && trainerName && (
          trainerName === userName ||
          (userUsername && trainerName === userUsername) ||
          trainerName === userEmpId ||
          trainerName === userId
        )
      );

      return employeeAssigned || trainerAssignedById || trainerAssignedLegacy;
    });

    // Fetch all courses for progress calculation
    const allCourseIds = Array.from(new Set(filteredTrainings.flatMap(t => t.courses)));
    let allCourses = [];
    if (allCourseIds.length > 0) {
      allCourses = await db('tg_courses')
        .whereIn('id', allCourseIds)
        .andWhere('is_deleted', 0)
        .select('*');
    }

    // Fetch all topics and subtopics for these courses
    const allTopics = allCourses.length > 0
      ? await db('tg_topics').whereIn('course_id', allCourses.map(c => c.id)).andWhere('is_deleted', 0).select('*')
      : [];
    const allTopicIds = allTopics.map(t => t.id);
    const allSubtopics = allTopicIds.length > 0
      ? await db('tg_subtopics').whereIn('topic_id', allTopicIds).andWhere('is_deleted', 0).select('*')
      : [];

    // Fetch completion status for subtopics for this employee
    let completedSubtopicIds = [];
    if (allSubtopics.length > 0) {
      const completedRows = await db('tg_emp_subtopic_progress')
        .where({ employee_id: user.id, is_completed: 1 })
        .whereIn('subtopic_id', allSubtopics.map(st => st.id))
        .select('subtopic_id');
      completedSubtopicIds = completedRows.map(r => r.subtopic_id);
    }

    // Helper to calculate progress for a training
    function calcTrainingProgress(training) {
      // Get all topics for this training's courses
      const courseIds = Array.isArray(training.courses) ? training.courses : [];
      const topics = allTopics.filter(t => courseIds.includes(t.course_id));
      const subtopics = topics.flatMap(topic => allSubtopics.filter(st => st.topic_id === topic.id));
      const totalSubtopics = subtopics.length;
      if (totalSubtopics === 0) return 0;
      const completed = subtopics.filter(st => completedSubtopicIds.includes(st.id)).length;
      return Math.round((completed / totalSubtopics) * 100);
    }

    // Add progress field to each training
    return filteredTrainings.map(training => ({
      ...training,
      progress: calcTrainingProgress(training)
    }));
  },

  getTrainingsByTrainerId: async (trainerUserId) => {
    const user = await db('tg_ad_users')
      .where({ id: trainerUserId, is_deleted: 0 })
      .first('id', 'name', 'username', 'emp_id');

    if (!user) return [];

    const hasTrainerId = await hasTrainerIdColumn();

    let rows;
    if (hasTrainerId) {
      rows = await db('tg_training_list')
        .where({ is_deleted: 0, trainer_id: user.id })
        .select('*')
        .orderBy('created_date', 'desc');
    } else {
      // Legacy fallback for older schemas where trainer_id is not present.
      const userName = normalizeText(user.name);
      const userUsername = normalizeText(user.username);
      const userEmpId = String(user.emp_id || '').trim();
      const userId = String(user.id);

      const legacyRows = await db('tg_training_list')
        .where({ is_deleted: 0 })
        .select('*')
        .orderBy('created_date', 'desc');

      rows = legacyRows.filter((row) => {
        const trainerName = normalizeText(row.trainer_name);
        return Boolean(
          trainerName && (
            trainerName === userName ||
            (userUsername && trainerName === userUsername) ||
            trainerName === userEmpId ||
            trainerName === userId
          )
        );
      });
    }

    return rows.map((row) => ({
      ...row,
      status: statusReverseMap[row.status] || 'upcoming',
      courses: parseJsonArray(row.courses),
      employees: parseJsonArray(row.employees),
    }));
  },

  getDashboardCountsByEmployeeId: async (employeeId) => {
    const trainings = await Profile.getTrainingsByEmployeeId(employeeId);
    const skillGapCourseIds = await getSkillGapMappedCourseIds(employeeId);

    const uniqueCourseIds = new Set();
    let totalTrainingMinutes = 0;

    for (const training of trainings) {
      const startMinutes = toMinutesFromTime(training.start_time);
      const endMinutes = toMinutesFromTime(training.end_time);
      if (endMinutes > startMinutes) {
        totalTrainingMinutes += (endMinutes - startMinutes);
      }

      const courseIds = Array.isArray(training.courses) ? training.courses : [];
      for (const courseId of courseIds) {
        const numericCourseId = Number(courseId);
        if (Number.isFinite(numericCourseId) && numericCourseId > 0) {
          uniqueCourseIds.add(numericCourseId);
        }
      }
    }

    for (const courseId of skillGapCourseIds) {
      uniqueCourseIds.add(courseId);
    }

    const myCourses = uniqueCourseIds.size;
    const myTrainings = trainings.length;
    const trainingHours = Math.round((totalTrainingMinutes / 60) * 10) / 10;

    if (myCourses === 0) {
      return {
        myCourses,
        myTrainings,
        completedExams: 0,
        upcomingExams: 0,
        trainingHours,
        certificates: 0,
      };
    }

    const exams = await db('tg_exam')
      .where({ is_deleted: 0 })
      .whereIn('training_id', Array.from(uniqueCourseIds))
      .select('id', 'scheduled_date');

    const examIds = exams.map((e) => Number(e.id)).filter((id) => Number.isFinite(id));
    if (examIds.length === 0) {
      return {
        myCourses,
        myTrainings,
        completedExams: 0,
        upcomingExams: 0,
        trainingHours,
        certificates: 0,
      };
    }

    let resultRows = [];
    let resultTable = await resolveExamResultTableName();
    if (resultTable) {
      resultRows = await db(resultTable)
        .where({ employee_id: employeeId, is_deleted: 0 })
        .whereIn('exam_id', examIds)
        .select('id', 'exam_id', 'training_id', 'status', 'is_pass', 'submitted_at')
        .orderBy('submitted_at', 'desc')
        .orderBy('id', 'desc');
    }

    const latestResultByExam = new Map();
    for (const row of resultRows) {
      const examId = Number(row.exam_id);
      if (!examId || latestResultByExam.has(examId)) continue;
      latestResultByExam.set(examId, row);
    }

    let completedExams = 0;
    let upcomingExams = 0;
    const passedTrainingIds = new Set();
    const now = new Date();

    for (const exam of exams) {
      const result = latestResultByExam.get(Number(exam.id));
      const resultStatus = String(result?.status || '').toLowerCase();
      const isCompleted = resultStatus === 'completed' || Number(result?.is_pass) === 1;

      if (isCompleted) {
        completedExams += 1;
        passedTrainingIds.add(Number(exam.training_id));
        continue;
      }

      const scheduledDate = exam.scheduled_date ? new Date(exam.scheduled_date) : null;
      if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate >= now) {
        upcomingExams += 1;
      }
    }

    let certificates = 0;
    if (passedTrainingIds.size > 0) {
      // Filter out NaN and non-finite values
      const validTrainingIds = Array.from(passedTrainingIds).filter(id => Number.isFinite(id) && !Number.isNaN(id));
      if (validTrainingIds.length > 0) {
        const certRows = await db('tg_exam_results')
          .where({ is_deleted: 0 })
          .whereIn('training_id', validTrainingIds)
          .countDistinct('id as total')
          .first();
        certificates = Number(certRows?.total || 0);
      } else {
        certificates = 0;
      }
    }

    return {
      myCourses,
      myTrainings,
      completedExams,
      upcomingExams,
      trainingHours,
      certificates,
    };
  },

  // Returns all exams for trainings assigned to the employee
  getExamsByEmployeeId: async (employeeId) => {

    // Step 1: Get trainings where employee is assigned
    const trainings = await db('tg_training_list')
      .where('employees', 'like', `%${employeeId}%`)
      .pluck('id');   // use id (training_id)

    if (!trainings.length) return [];

    // Step 2: Get exams for those trainings
    const exams = await db('tg_exam as e')
      .whereIn('training_id', trainings)
      .leftJoin('tg_training_list as t', 'e.training_id', 't.id')
      .andWhere('e.is_deleted', 0)
      .select('e.*', 't.name');

    return exams;
  },

   getCertificatesByEmployeeId: async (employeeId) => {
    // Get all trainings assigned to this employee
    const user = await db('tg_ad_users')
      .where({ id: employeeId, is_deleted: 0 })
      .first('id', 'emp_id');
    if (!user) return [];
    const userId = String(user.id);
    const userEmpId = String(user.emp_id || '');

    // Get all training IDs assigned to this employee
    const assignedTrainings = await db('tg_training_list')
      .where({ is_deleted: 0 })
      .select('id', 'employees', 'courses');
    const assignedIds = assignedTrainings
      .filter(row => {
        const employees = Array.isArray(row.employees) ? row.employees : (row.employees ? JSON.parse(row.employees) : []);
        return employees.some(id => String(id).trim() === userId || (userEmpId && String(id).trim() === userEmpId));
      })
      .map(row => row.id);

    if (!assignedIds.length) return [];

    // Get the latest exam result for each training for this user
    const resultTable = await resolveExamResultTableName();
    const latestResults = await db(resultTable)
      .where({ employee_id: user.id, is_deleted: 0 })
      .whereIn('training_id', assignedIds)
      .select('training_id', 'is_pass', 'submitted_at')
      .orderBy('submitted_at', 'desc');

    // Map to get only the latest result per training
    const latestResultByTraining = new Map();
    for (const row of latestResults) {
      if (!latestResultByTraining.has(row.training_id)) {
        latestResultByTraining.set(row.training_id, row);
      }
    }

    // Only include trainings where the user has passed
    const passedTrainingIds = Array.from(latestResultByTraining.entries())
      .filter(([_, row]) => Number(row.is_pass) === 1)
      .map(([training_id, _]) => training_id);

    if (!passedTrainingIds.length) return [];

    // Get certificates for these trainings
    const certs = await db('tg_certificate as c')
      .leftJoin('tg_training_list as cr', 'c.training_id', 'cr.id')
      .leftJoin(
        db(resultTable)
          .select('training_id')
          .max('submitted_at as submitted_at')
          .where({ employee_id: user.id, is_deleted: 0 })
          .whereIn('training_id', passedTrainingIds)
          .groupBy('training_id')
          .as('er'),
        'c.training_id',
        'er.training_id'
      )
      .select(
        'c.id',
        'c.training_id',
        'cr.name',
        'cr.training_type',
        'c.status',
        'c.template_name',
        'c.template_path',
        'er.submitted_at',
        'cr.courses' // get courses column for later
      )
      .where('c.is_deleted', 0)
      .whereIn('c.training_id', passedTrainingIds)
      .orderBy('c.created_date', 'desc');

    // Collect all course IDs from all certs
    const allCourseIds = Array.from(new Set(
      certs.flatMap(cert => {
        let courses = cert.courses;
        if (!Array.isArray(courses)) {
          try {
            courses = courses ? JSON.parse(courses) : [];
          } catch {
            courses = [];
          }
        }
        return courses;
      })
    ));

    let courseNamesById = {};
    if (allCourseIds.length > 0) {
      const courseRows = await db('tg_courses')
        .whereIn('id', allCourseIds)
        .andWhere('is_deleted', 0)
        .select('id', 'course_name');
      courseNamesById = courseRows.reduce((acc, row) => {
        acc[String(row.id)] = row.course_name;
        return acc;
      }, {});
    }

    // Attach course_names array to each cert
    const certsWithCourseNames = certs.map(cert => {
      let courses = cert.courses;
      if (!Array.isArray(courses)) {
        try {
          courses = courses ? JSON.parse(courses) : [];
        } catch {
          courses = [];
        }
      }
      return {
        ...cert,
        course_names: courses.map(cid => courseNamesById[String(cid)]).filter(Boolean)
      };
    });
    // Remove the raw courses property from the result for cleanliness
    return certsWithCourseNames.map(({ courses, ...rest }) => rest);
  }
}


// Returns all completed courses for an employee (course completion table must exist)
const getCompletedCoursesByEmployeeId = async (employeeId) => {
  // Assuming a table 'tg_course_completion' with columns: employee_id, course_id, is_completed
  // Adjust table/column names as per your schema
  return db('tg_course_completion')
    .where({ employee_id: employeeId, is_completed: 1 })
    .select('course_id');
};


// Returns all exams for a given training
const getExamsByTrainingId = async (trainingId) => {
  return db('tg_exam')
    .where({ training_id: trainingId, is_deleted: 0 })
    .select('*');
};


// Export new helpers for controller
Profile.getSkillGapMappedCourseIds = getSkillGapMappedCourseIds;
Profile.getCompletedCoursesByEmployeeId = getCompletedCoursesByEmployeeId;
Profile.getExamsByTrainingId = getExamsByTrainingId;

module.exports = Profile;