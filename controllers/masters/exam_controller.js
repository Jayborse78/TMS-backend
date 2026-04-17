const db = require("../../DB/knex");     
const examModel = require("../../model/masters/exam_model");
// Create exam automatically when course + type selected
exports.createAutoExam = async (req, res) => {
  try {
    const {
      training_id,
      question_type,
      created_by,
      exam_code,
      description,
      duration,
      total_marks,
      passing_marks,
      scheduled_date,
    } = req.body;

    console.log("[exam] createAutoExam body", req.body);

    const result = await examModel.createAutoExam(
      training_id,
      question_type,
      created_by,
      exam_code,
      description,
      duration,
      total_marks,
      passing_marks,
      scheduled_date
    );

    // ensure we always return the stored exam_code
    let finalCode = result && result.exam_code ? result.exam_code : null;
    if (!finalCode && result && result.id) {
      try {
        const row = await db("tg_exam").where({ id: result.id }).first();
        finalCode = row ? row.exam_code : null;
      } catch (e) {
        console.error("[exam] fetch after insert error", e);
      }
    }

    res.json({ success: true, exam_id: result.id, exam_code: finalCode });
  } catch (err) {
    console.error("[exam] createAutoExam error", err.stack || err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update exam metadata
exports.updateExam = async (req, res) => {
  const id = req.params.id;
  const payload = req.body;

  try {
    const row = await examModel.updateExam(id, payload);
    res.json({ success: true, exam: row });
  } catch (err) {
    console.error("[exam] updateExam error", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get questions by course + type
exports.getQuestionsByCourseType = async (req, res) => {
  try {
    const { training_id, question_type } = req.query;

    const data = await examModel.getQuestionsByCourseType(
      training_id,
      question_type
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get difficulty counts
exports.getQuestionCounts = async (req, res) => {
  try {
    const { traininglist_id, question_type } = req.query;

    const data = await examModel.getQuestionCounts(
      training_id,
      question_type
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteExam = async (req, res) => {
  const id = req.params.id;

  try {
    // soft delete: mark row as is_deleted=1
    await db("tg_exam")
      .where({ id })
      .update({ is_deleted: 1, updated_date: new Date(), updated_by: req.user?.id || null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateQuestionCount = async (req, res) => {
  const id = req.params.id;
  const { selected_questions, total_questions } = req.body;

  try {
    await db("tg_exam")
      .where({ id })
      .update({
        selected_questions,
        total_questions,
      });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getExamList = async (req, res) => {
  try {
    // build select list dynamically based on existing columns
    const baseCols = [
      "e.id",
      "e.exam_code",
      "e.training_id",
      "t.name",
      "e.question_type",
      "e.total_questions",
      "e.selected_questions",
      "e.status",
    ];

    const optionalCols = [
      "description",
      "duration",
      "total_marks",
      "passing_marks",
      "scheduled_date",
    ];

    for (const col of optionalCols) {
      try {
        const exists = await db.schema.hasColumn("tg_exam", col);
        if (exists) baseCols.push(`e.${col}`);
      } catch (e) {
        // ignore errors, assume column absent
      }
    }

    let rows = [];
    try {
      rows = await db("tg_exam as e")
        .leftJoin("tg_training_list as t", "t.id", "e.training_id")
        .where("e.is_deleted", 0)
        .select(baseCols)
        .orderBy("e.id", "desc");
    } catch (err) {
      // fallback: fetch exams without join if join fails
      rows = await db("tg_exam as e")
        .where("e.is_deleted", 0)
        .select("e.*")
        .orderBy("e.id", "desc");
      // add training_name as null for compatibility
      rows = rows.map(r => ({ ...r, training_name: null }));
    }
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Return next exam code (preview) based on current max id
exports.getNextExamCode = async (req, res) => {
  try {
    const row = await db("tg_exam").max("id as maxId").first();
    const nextId = row && row.maxId ? Number(row.maxId) + 1 : 1;
    const exam_code = "EX" + String(nextId).padStart(3, "0");

    res.json({ success: true, exam_code, next_id: nextId });
  } catch (err) {
    console.error("[exam] getNextExamCode error", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const employeeId = req.user?.id;
    const {
      exam_id,
      answers,
      question_ids,
      time_taken_seconds,
    } = req.body || {};

    if (!employeeId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!exam_id) {
      return res.status(400).json({ success: false, message: "exam_id is required" });
    }

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ success: false, message: "answers object is required" });
    }

    const result = await examModel.submitExamAttempt({
      examId: exam_id,
      employeeId,
      answers,
      questionIds: question_ids,
      timeTakenSeconds: time_taken_seconds,
    });

    console.log('Exam submission response:', result);
    res.json({ success: true, result });
  } catch (err) {
    console.error("[exam] submitExam error", err.stack || err);
    if (String(err?.message || "").toLowerCase().includes("not found")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message || "Unable to submit exam" });
  }
};

exports.getMyExamStatuses = async (req, res) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const rows = await examModel.getMyExamStatuses(employeeId);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[exam] getMyExamStatuses error", err.stack || err);
    res.status(500).json({ success: false, message: err.message || "Unable to load exam statuses" });
  }
};

exports.getMyExamResult = async (req, res) => {
  try {
    const employeeId = req.user?.id;
    const examId = Number(req.params.examId);

    if (!employeeId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!Number.isFinite(examId) || examId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid exam id" });
    }

    const result = await examModel.getMyExamResult({ employeeId, examId });
    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[exam] getMyExamResult error", err.stack || err);
    res.status(500).json({ success: false, message: err.message || "Unable to load exam result" });
  }
};

exports.getAssessmentOverview = async (req, res) => {
  try {
    const data = await examModel.getAssessmentOverview();
    res.json({ success: true, data });
  } catch (err) {
    console.error("[exam] getAssessmentOverview error", err.stack || err);
    res.status(500).json({ success: false, message: err.message || "Unable to load assessment overview" });
  }
};


exports.rescheduleExam = async (req, res) => {
  try {
    const { exam_id, new_date } = req.body;
    const employee_id = req.user?.id; 
    console.log('[rescheduleExam] exam_id:', exam_id, 'employee_id:', employee_id, 'new_date:', new_date);
    // Insert new reschedule
    await examModel.rescheduleExam(exam_id, employee_id, new_date);


    res.json({ success: true, message: 'Exam rescheduled successfully' });
  } catch (err) {
    console.error('[exam] rescheduleExam error', err.stack || err);
    res.status(500).json({ success: false, message: err.message || 'Unable to reschedule exam' });
  }
};


// Get all rescheduled exams for the logged-in employee
exports.getRescheduledExams = async (req, res) => {
  try {
    const employeeId = req.user?.id;
    if (!employeeId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const exams = await examModel.getRescheduledExamsByEmployee(employeeId);
    res.json({ success: true, data: exams });
  } catch (err) {
    console.error('[exam] getRescheduledExams error', err.stack || err);
    res.status(500).json({ success: false, message: err.message || 'Unable to load rescheduled exams' });
  }
};