const db = require("../../DB/knex");

const normalizeQuestionType = (value) => {
  const type = String(value || "").toLowerCase().trim();
  if (type === "mcq" || type === "true/false" || type === "true false") return "mcq";
  return "descriptive";
};

const normalizeAnswerValue = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().toLowerCase();
};

const normalizeDateTimeValue = (value) => {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

const ensureExamScheduledDateColumn = async () => {
  try {
    const exists = await db.schema.hasColumn("tg_exam", "scheduled_date");
    if (!exists) {
      await db.schema.alterTable("tg_exam", (table) => {
        table.dateTime("scheduled_date").nullable();
      });
    }
  } catch (_) {
    // Intentionally ignore schema alteration errors to avoid breaking requests.
  }
};

const getOptionByIndex = (questionRow, index) => {
  const options = [
    questionRow?.option1_true,
    questionRow?.option2_false,
    questionRow?.option3,
    questionRow?.option4,
  ];
  return options[index] || "";
};

const getCorrectAnswerForQuestion = (questionRow) => {
  const displayValue = getCorrectAnswerDisplayValue(questionRow);
  return normalizeAnswerValue(displayValue);
};

const getCorrectAnswerDisplayValue = (questionRow) => {
  const normalizedType = normalizeQuestionType(questionRow?.type);
  if (normalizedType !== "mcq") {
    return String(questionRow?.desc_ans || "").trim();
  }

  const numericAnswer = Number(questionRow?.mca_ans);
  if ([1, 2, 3, 4].includes(numericAnswer)) {
    return String(getOptionByIndex(questionRow, numericAnswer - 1) || "").trim();
  }

  const answer = String(questionRow?.mca_ans || "").trim();
  if (["a", "b", "c", "d", "A", "B", "C", "D"].includes(answer)) {
    const map = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
    return String(getOptionByIndex(questionRow, map[answer]) || "").trim();
  }

  return answer;
};

const ensureExamResultsTable = async () => {
  const hasSingularTable = await db.schema.hasTable("tg_exam_result");
  const hasPluralTable = await db.schema.hasTable("tg_exam_results");
  if (hasSingularTable || hasPluralTable) return;

  await db.schema.createTable("tg_exam_results", (table) => {
    table.increments("id").primary();
    table.integer("exam_id").unsigned().notNullable();
    table.integer("employee_id").unsigned().notNullable();
    table.integer("course_id").unsigned().notNullable();
    table.integer("total_questions").defaultTo(0);
    table.integer("answered_questions").defaultTo(0);
    table.integer("correct_answers").defaultTo(0);
    table.decimal("score", 10, 2).defaultTo(0);
    table.decimal("total_marks", 10, 2).defaultTo(0);
    table.decimal("passing_marks", 10, 2).defaultTo(0);
    table.boolean("is_pass").defaultTo(0);
    table.string("status", 30).defaultTo("failed");
    table.text("answers_json", "longtext");
    table.timestamp("submitted_at").defaultTo(db.fn.now());
    table.integer("is_deleted").defaultTo(0);
    table.timestamp("created_date").defaultTo(db.fn.now());
    table.integer("created_by").nullable();
    table.timestamp("updated_date").nullable();
    table.integer("updated_by").nullable();
  });
};

const resolveExamResultTableName = async () => {
  const hasPluralTable = await db.schema.hasTable("tg_exam_results");
  if (hasPluralTable) return "tg_exam_results";

  const hasSingularTable = await db.schema.hasTable("tg_exam_result");
  if (hasSingularTable) return "tg_exam_result";

  return "tg_exam_results";
};

const ensureResultStatusColumn = async (tableName) => {
  try {
    const hasStatusColumn = await db.schema.hasColumn(tableName, "status");
    if (!hasStatusColumn) {
      await db.schema.alterTable(tableName, (table) => {
        table.string("status", 30).defaultTo("failed");
      });
    }
  } catch (_) {
    // no-op
  }
};

// Create exam if not exists (accepts optional exam_code)
exports.createAutoExam = async (
  training_id,
  question_type,
  created_by,
  exam_code = null,
  description = null,
  duration = null,
  total_marks = null,
  passing_marks = null,
  scheduled_date = null
) => {
  const normalizedScheduledDate = normalizeDateTimeValue(scheduled_date);
  if (scheduled_date !== undefined) {
    await ensureExamScheduledDateColumn();
  }

  // look for existing row
  const existing = await db("tg_exam")
    .select("id", "exam_code")
    .where({ training_id, question_type, is_deleted: 0 })
    .first();

  if (existing) {
    // keep metadata up to date for existing exam rows too
    const updatePayload = {};
    const existingAllowed = [
      ["description", description],
      ["duration", duration],
      ["total_marks", total_marks],
      ["passing_marks", passing_marks],
      ["scheduled_date", normalizedScheduledDate],
    ];

    for (const [col, val] of existingAllowed) {
      if (val === undefined) continue;
      try {
        const exists = await db.schema.hasColumn("tg_exam", col);
        if (exists) updatePayload[col] = val;
      } catch (_) {
        updatePayload[col] = val;
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      await db("tg_exam").where({ id: existing.id }).update(updatePayload);
    }

    // if existing row has no exam_code, generate and save one
    if (!existing.exam_code) {
      const code = "EX" + String(existing.id).padStart(3, "0");
      await db("tg_exam").where({ id: existing.id }).update({ exam_code: code });
      return { id: existing.id, exam_code: code };
    }

    return { id: existing.id, exam_code: existing.exam_code };
  }

  // insert row; only include columns that actually exist in the table
  const insertObj = {
    training_id,
    question_type,
    created_by,
  };

  // check optional columns existence and only add if present
  const optionalCols = [
    ["exam_code", exam_code],
    ["description", description],
    ["duration", duration],
    ["total_marks", total_marks],
    ["passing_marks", passing_marks],
    ["scheduled_date", normalizedScheduledDate],
  ];

  for (const [col, val] of optionalCols) {
    // hasColumn returns true/false
    // note: calling hasColumn multiple times is OK for small number of cols
    try {
      // knex schema hasColumn expects table name, column name
      // using await to ensure sequential checks
      // avoid throwing if hasColumn is not supported (fallback: include col)
      const exists = await db.schema.hasColumn("tg_exam", col);
      if (exists && val !== undefined) insertObj[col] = val;
    } catch (e) {
      // if schema check fails, skip adding the column
    }
  }

  const [insertedId] = await db("tg_exam").insert(insertObj);

  // if no exam_code provided but the table has exam_code, generate sequential code
  let finalCode = exam_code || null;
  try {
    const hasExamCode = await db.schema.hasColumn("tg_exam", "exam_code");
    if (!finalCode && hasExamCode) {
      finalCode = "EX" + String(insertedId).padStart(3, "0");
      await db("tg_exam").where({ id: insertedId }).update({ exam_code: finalCode });
    }
  } catch (e) {
    // ignore schema errors
  }

  return { id: insertedId, exam_code: finalCode };
};

exports.updateExam = async (id, data) => {
  if (data?.scheduled_date !== undefined) {
    await ensureExamScheduledDateColumn();
    data.scheduled_date = normalizeDateTimeValue(data.scheduled_date);
  }

  const allowed = [
    "exam_code",
    "description",
    "duration",
    "total_marks",
    "passing_marks",
    "scheduled_date",
    "course_id",
    "question_type",
    "status",
  ];

  const payload = {};

  // only include allowed fields that also exist in the table
  for (const k of allowed) {
    if (data[k] === undefined) continue;
    try {
      const exists = await db.schema.hasColumn("tg_exam", k);
      if (exists) payload[k] = data[k];
    } catch (e) {
      // if hasColumn fails, optimistically include the field
      payload[k] = data[k];
    }
  }

  if (Object.keys(payload).length === 0) {
    // nothing to update
    const row0 = await db("tg_exam").where({ id }).first();
    return row0;
  }

  await db("tg_exam").where({ id }).update(payload);
  const row = await db("tg_exam").where({ id }).first();
  return row;
};

// Questions by course + type
exports.getQuestionsByCourseType = async (training_id, question_type) => {
  const query = db("tg_question_list")
    .select(
      "id",
      "que_text",
      "level",
      "type",
      "option1_true",
      "option2_false",
      "option3",
      "option4",
      "desc_ans",
      "mca_ans",
      "marks",
    )
    .where({ training_id: training_id, status: 1, is_deleted: 0 });

  if (question_type && question_type !== "Mixed") {
    query.andWhere("type", question_type);
  } 
  return await query;
};

// Counts by difficulty
exports.getQuestionCounts = async (course_id, question_type) => {
  const query = db("tg_question_list")
    .select("level")
    .count("* as count")
    .where({ course_id, status: 1, is_deleted: 0 });

  if (question_type && question_type !== "Mixed") {
    query.andWhere("type", question_type);
  }

  query.groupBy("level");
  return await query;
};

exports.submitExamAttempt = async ({
  examId,
  employeeId,
  answers,
  questionIds = [],
  timeTakenSeconds = null,
}) => {
  await ensureExamResultsTable();
  const resultTable = await resolveExamResultTableName();
  await ensureResultStatusColumn(resultTable);

  const examRow = await db("tg_exam")
    .where({ id: examId, is_deleted: 0 })
    .orWhere({ exam_code: examId, is_deleted: 0 })
    .first();

  if (!examRow) {
    throw new Error("Exam not found");
  }

  const resolvedQuestionIds = Array.from(
    new Set((Array.isArray(questionIds) ? questionIds : []).map((id) => Number(id)).filter(Boolean)),
  );

  let questionsQuery = db("tg_question_list")
    .select(
      "id",
      "que_text",
      "type",
      "option1_true",
      "option2_false",
      "option3",
      "option4",
      "mca_ans",
      "desc_ans",
      "training_id",
    )
    .where({ training_id: examRow.training_id, is_deleted: 0 });

  if (resolvedQuestionIds.length > 0) {
    questionsQuery = questionsQuery.whereIn("id", resolvedQuestionIds);
  }

  const questionRows = await questionsQuery;
  const totalQuestions = questionRows.length;

  const totalMarks = Number(examRow?.total_marks || 100);
  const passingMarks = Number(examRow?.passing_marks || 0);
  const marksPerQuestion = totalQuestions > 0 ? Math.max(1, Math.round(totalMarks / totalQuestions)) : 0;

  let answeredQuestions = 0;
  let correctAnswers = 0;
  const questionResults = [];

  for (const question of questionRows) {
    const selectedRaw = answers ? (answers[question.id] ?? answers[String(question.id)]) : undefined;
    const selected = normalizeAnswerValue(selectedRaw);
    const selectedDisplay = selectedRaw === undefined || selectedRaw === null ? "" : String(selectedRaw).trim();
    const hasSelectedAnswer = selected.length > 0;
    if (hasSelectedAnswer) {
      answeredQuestions += 1;
    }

    const questionType = normalizeQuestionType(question?.type);
    const correctDisplay = getCorrectAnswerDisplayValue(question);
    const correct = normalizeAnswerValue(correctDisplay);

    let isCorrect = null;
    if (questionType === "mcq") {
      isCorrect = hasSelectedAnswer && Boolean(correct) && selected === correct;
      if (isCorrect) {
        correctAnswers += 1;
      }
    }

    questionResults.push({
      question_id: question.id,
      question: question.que_text || "",
      question_type: questionType,
      selected_answer: selectedDisplay,
      correct_answer: correctDisplay,
      is_correct: isCorrect,
    });
  }

  const score = correctAnswers * marksPerQuestion;
  const isPass = score >= passingMarks;

  const answerPayload = {
    question_ids: questionRows.map((q) => q.id),
    answers: answers || {},
    question_results: questionResults,
    time_taken_seconds: timeTakenSeconds,
  };

  const columns = [
    "exam_id",
    "employee_id",
    "training_id",
    "total_questions",
    "answered_questions",
    "correct_answers",
    "score",
    "total_marks",
    "passing_marks",
    "is_pass",
    "status",
    "answers_json",
    "submitted_at",
    "created_date",
    "created_by",
  ];

  const resultPayload = {
    exam_id: examRow.id,
    employee_id: employeeId,
    training_id: examRow.training_id,
    total_questions: totalQuestions,
    answered_questions: answeredQuestions,
    correct_answers: correctAnswers,
    score,
    total_marks: totalMarks,
    passing_marks: passingMarks,
    is_pass: isPass ? 1 : 0,
    status: isPass ? "completed" : "failed",
    answers_json: JSON.stringify(answerPayload),
    submitted_at: db.fn.now(),
    created_date: db.fn.now(),
    created_by: employeeId,
  };

  const finalInsertPayload = {};
  for (const col of columns) {
    try {
      const hasCol = await db.schema.hasColumn(resultTable, col);
      if (hasCol) {
        finalInsertPayload[col] = resultPayload[col];
      }
    } catch (_) {
      finalInsertPayload[col] = resultPayload[col];
    }
  }

  const [resultId] = await db(resultTable).insert(finalInsertPayload);

  let certificate = null;
  if (isPass) {
    certificate = await db("tg_certificate as c")
      .leftJoin("tg_training_list as tr", "tr.id", "c.training_id")
      .where({ "c.training_id": examRow.training_id, "c.is_deleted": 0 })
      .select(
        "c.id",
        "c.training_id",
        "c.template_name",
        "c.template_path",
        "tr.name",
      )
      .first();
  }

  return {
    result_id: resultId,
    exam_id: examRow.id,
    training_id: examRow.training_id,
    total_questions: totalQuestions,
    answered_questions: answeredQuestions,
    correct_answers: correctAnswers,
    score,
    total_marks: totalMarks,
    passing_marks: passingMarks,
    is_pass: isPass,
    question_results: questionResults,
    certificate,
  };
};

exports.getMyExamStatuses = async (employeeId) => {
  await ensureExamResultsTable();
  const resultTable = await resolveExamResultTableName();
  await ensureResultStatusColumn(resultTable);

  const rows = await db(resultTable)
    .where({ employee_id: employeeId, is_deleted: 0 })
    .select("id", "exam_id", "status", "is_pass", "submitted_at")
    .orderBy("submitted_at", "desc")
    .orderBy("id", "desc");

  const latestByExam = new Map();
  for (const row of rows) {
    const examId = Number(row.exam_id);
    if (!examId || latestByExam.has(examId)) continue;

    const derivedStatus = row.status || (Number(row.is_pass) ? "completed" : "failed");
    latestByExam.set(examId, {
      exam_id: examId,
      status: String(derivedStatus).toLowerCase(),
      is_pass: Number(row.is_pass) === 1,
      submitted_at: row.submitted_at,
    });
  }

  return Array.from(latestByExam.values());
};

exports.getMyExamResult = async ({ employeeId, examId }) => {
  await ensureExamResultsTable();
  const resultTable = await resolveExamResultTableName();
  await ensureResultStatusColumn(resultTable);

  const row = await db(resultTable)
    .where({ employee_id: employeeId, exam_id: examId, is_deleted: 0 })
    .orderBy("submitted_at", "desc")
    .orderBy("id", "desc")
    .first();

  if (!row) return null;

  let parsedAnswers = null;
  try {
    parsedAnswers = row.answers_json ? JSON.parse(row.answers_json) : null;
  } catch (_) {
    parsedAnswers = null;
  }

  return {
    id: row.id,
    exam_id: Number(row.exam_id),
    employee_id: Number(row.employee_id),
    course_id: Number(row.course_id),
    total_questions: Number(row.total_questions || 0),
    answered_questions: Number(row.answered_questions || 0),
    correct_answers: Number(row.correct_answers || 0),
    score: Number(row.score || 0),
    total_marks: Number(row.total_marks || 0),
    passing_marks: Number(row.passing_marks || 0),
    is_pass: Number(row.is_pass) === 1,
    status: String(row.status || "").toLowerCase() || (Number(row.is_pass) === 1 ? "completed" : "failed"),
    submitted_at: row.submitted_at,
    question_results: Array.isArray(parsedAnswers?.question_results) ? parsedAnswers.question_results : [],
  };
};

exports.getAssessmentOverview = async () => {
  await ensureExamResultsTable();
  const resultTable = await resolveExamResultTableName();
  await ensureResultStatusColumn(resultTable);

  const exams = await db("tg_exam as e")
    .leftJoin("tg_training_list as c", "c.id", "e.training_id")
    .where("e.is_deleted", 0)
    .select(
      "e.id",
      "e.training_id",
      "c.name",
      "e.question_type",
      "e.total_marks",
      "e.passing_marks",
      "e.scheduled_date",
      "e.status",
    )
    .orderBy("e.id", "desc");

  if (exams.length === 0) {
    return [];
  }

  const examIds = exams
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id));

  if (examIds.length === 0) {
    return exams.map((exam) => ({
      exam_id: Number(exam.id),
      exam_code: exam.exam_code || "",
      exam_name: exam.exam_code || `EX-${exam.id}`,
      training_name: exam.name || "-",
      question_type: exam.question_type || "",
      total_marks: Number(exam.total_marks || 0),
      passing_marks: Number(exam.passing_marks || 0),
      scheduled_date: exam.scheduled_date,
      exam_status: exam.status,
      attempts: 0,
      pass_count: 0,
      fail_count: 0,
      pass_rate: 0,
      avg_score: 0,
      candidates: [],
    }));
  }

  const rawRows = await db(`${resultTable} as r`)
    .leftJoin("tg_ad_users as u", "u.id", "r.employee_id")
    .leftJoin("tg_roles as rl", "rl.id", "u.role_id")
    .where("r.is_deleted", 0)
    .whereIn("r.exam_id", examIds)
    .select(
      "r.id",
      "r.exam_id",
      "r.employee_id",
      "r.score",
      "r.total_marks",
      "r.is_pass",
      "r.status",
      "r.submitted_at",
      "u.name as employee_name",
      "u.emp_id as employee_code",
      "rl.role_name as role_name",
    )
    .orderBy("r.submitted_at", "desc")
    .orderBy("r.id", "desc");

  const latestAttemptByExamEmployee = new Map();
  for (const row of rawRows) {
    const examId = Number(row.exam_id);
    const employeeId = Number(row.employee_id);
    if (!examId || !employeeId) continue;

    const key = `${examId}:${employeeId}`;
    if (!latestAttemptByExamEmployee.has(key)) {
      latestAttemptByExamEmployee.set(key, row);
    }
  }

  const candidatesByExam = new Map();
  for (const row of latestAttemptByExamEmployee.values()) {
    const examId = Number(row.exam_id);
    if (!candidatesByExam.has(examId)) {
      candidatesByExam.set(examId, []);
    }

    const normalizedStatus = String(row.status || "").toLowerCase() || (Number(row.is_pass) === 1 ? "pass" : "fail");
    const finalStatus = normalizedStatus === "completed" ? "pass" : normalizedStatus;

    candidatesByExam.get(examId).push({
      result_id: Number(row.id),
      employee_id: Number(row.employee_id),
      employee_name: row.employee_name || "Unknown",
      employee_code: row.employee_code || "",
      role_name: row.role_name || "-",
      score: Number(row.score || 0),
      total_marks: Number(row.total_marks || 0),
      status: finalStatus === "pass" ? "pass" : "fail",
      submitted_at: row.submitted_at,
    });
  }

  return exams.map((exam) => {
    const examId = Number(exam.id);
    const candidates = candidatesByExam.get(examId) || [];
    const attempts = candidates.length;
    const passCount = candidates.filter((row) => row.status === "pass").length;
    const failCount = attempts - passCount;
    const avgScore = attempts
      ? Math.round((candidates.reduce((sum, row) => sum + Number(row.score || 0), 0) / attempts) * 100) / 100
      : 0;
    const passRate = attempts ? Math.round((passCount / attempts) * 100) : 0;

    return {
      exam_id: examId,
      exam_code: exam.exam_code || "",
      exam_name: exam.exam_code || `EX-${exam.id}`,
      training_id: Number(exam.training_id || 0),
      training_name: exam.name || "-",
      question_type: exam.question_type || "",
      total_marks: Number(exam.total_marks || 0),
      passing_marks: Number(exam.passing_marks || 0),
      scheduled_date: exam.scheduled_date,
      exam_status: exam.status,
      attempts,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: passRate,
      avg_score: avgScore,
      candidates,
    };
  });
};

exports.rescheduleExam = async (exam_id, employee_id, new_date) => {
  return db('tg_exam_schedule').insert({
    exam_id: exam_id,
    employee_id: employee_id,
    scheduled_date: new_date, 
    status: 'rescheduled',
    is_rescheduled: 1,
    created_at: db.fn.now()
  });
};

// Get all rescheduled exams for an employee
exports.getRescheduledExamsByEmployee = async (employee_id) => {
  return db('tg_exam_schedule as es')
    .join('tg_exam as e', 'es.exam_id', 'e.id')
    .leftJoin('tg_training_list as tr', 'tr.id', 'e.training_id')
    .select(
      'es.id as schedule_id',
      'es.exam_id',
      'es.scheduled_date',
      'es.status',
      'e.exam_code',
      'e.description',
      'e.total_marks',
      'e.passing_marks',
      'e.duration',
      'e.training_id',
      'tr.name',
    )
    .where('es.employee_id', employee_id)
    .andWhere('es.status', 'rescheduled')
    .orderBy('es.scheduled_date', 'desc');
};
