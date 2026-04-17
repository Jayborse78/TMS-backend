const db = require("../../DB/knex");
const XLSX = require('xlsx');

const mapNumberToAnswer = (num) => {
  const n = Number(num); // ⭐ convert string → number

  switch (n) {
    case 1: return "A";
    case 2: return "B";
    case 3: return "C";
    case 4: return "D";
    default: return "";
  }
};

const Question = {

  getAllQuestionCourses: async () => {
    return db("tg_question as r")
      .join("tg_training_list as t", "r.training_id", "t.id") // ⭐ Updated table & column names
      .leftJoin("tg_question_list as ql", function () {
        this.on("ql.training_id", "=", "r.training_id")
          .andOn("ql.level", "=", "r.level")
          .andOn("ql.type", "=", "r.type")
          .andOn("ql.is_deleted", "=", db.raw("0"));
      })
      .where("r.is_deleted", 0)
      .groupBy(
        "r.id",
        "r.training_id",
        "t.name",       // ⭐ Group by 'name' as per your DB screenshot
        "r.level",
        "r.type",
        "r.status",      // ⭐ Added to fix 500 Error (Strict Group By)
        "r.created_date" // ⭐ Added to fix 500 Error (Strict Group By)
      )
      .select(
        "r.id",
        "r.training_id",
        "t.name as training_name", // ⭐ Alias 'name' to 'training_name' for frontend
        "r.level",
        "r.type",
        "r.status"
      )
      .count("ql.id as total_questions")
      .orderBy("r.created_date", "desc");
  },

  createQuestionCourse: async (data) => {
    const exists = await db("tg_question")
      .where({
        training_id: data.training_id,
        level: data.level,
        type: data.type,
        is_deleted: 0
      })
      .first();

    if (exists) {
      throw new Error("ROW_EXISTS");
    }

    const [id] = await db("tg_question").insert({
      training_id: data.training_id,
      level: data.level,
      type: data.type,
      status: Number(data.status) === 0 ? 0 : 1,
      created_by: 1
    });

    return id;
  },

  getQuestionsByRow: async (training_id, level, type) => {
    const rows = await db("tg_question_list")
      .where({
        training_id,
        level,
        type,
        is_deleted: 0
      });

    return rows.map(r => ({
      ...r,
      mca_ans: mapNumberToAnswer(r.mca_ans)
    }));
  },

  deleteRow: async (id) => {
    await db("tg_question")
      .where({ id })
      .update({ is_deleted: 1 });
  },

  updateRowStatus: async (id, status) => {
    await db("tg_question")
      .where({ id, is_deleted: 0 })
      .update({
        status: Number(status) === 0 ? 0 : 1,
        updated_by: 1,
        updated_date: db.fn.now(),
      });
  },

  addQuestion: async (data) => {
    const numericAns = mapAnswerToNumber(data.type, data.mca_ans);

    const [id] = await db("tg_question_list").insert({
      training_id: data.training_id,
      level: data.level,
      type: data.type,
      que_text: data.que_text,
      option1_true: data.option1_true,
      option2_false: data.option2_false,
      option3: data.option3,
      option4: data.option4,
      desc_ans: data.desc_ans,
      mca_ans: numericAns,
      marks: data.marks || 1,
      created_by: 1
    });
    return id;
  },

  deleteQuestion: async (id) => {
    await db("tg_question_list")
      .where({ id })
      .update({ is_deleted: 1 });
  },

  countQuestions: async (row_id) => {
    const result = await db("tg_question_list")
      .where({
        training_id: row_id,
        is_deleted: 0
      })
      .count("* as total")
      .first();

    return result.total || 0;
  },

  updateQuestion: async (id, data) => {
    const numericAns = mapAnswerToNumber(data.type, data.mca_ans);

    await db("tg_question_list")
      .where({ id })
      .update({
        que_text: data.que_text,
        option1_true: data.option1_true,
        option2_false: data.option2_false,
        option3: data.option3,
        option4: data.option4,
        desc_ans: data.desc_ans,
        mca_ans: numericAns,
        marks: data.marks || 1,
        updated_by: 1,
      });
  },

  checkRowExists: async (training_id, level, type) => {
    const row = await db("tg_question")
      .where({ training_id, level, type, is_deleted: 0 })
      .first();

    return !!row;
  },

  async bulkUploadQuestionsFromExcel(fileBuffer, training_id, level, type, created_by ) {
    // Parse Excel
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });


    // Prepare insert data
    const questions = rows.map(row => ({
      training_id,
      level,
      type,
      que_text: row['Question Text'] || row['que_text'] || '',
      option1_true: row['Option A'] || row['option1_true'] || '',
      option2_false: row['Option B'] || row['option2_false'] || '',
      option3: row['Option C'] || row['option3'] || '',
      option4: row['Option D'] || row['option4'] || '',
      desc_ans: row['Explanation'] || row['desc_ans'] || '',
      mca_ans: row['Correct Answer'] || row['mca_ans'] || '',
      marks: row['Marks'] || row['marks'] || 1,
      created_date: db.fn.now(),
    }));

    // Insert all questions
    if (questions.length > 0) {
      await db('tg_question_list').insert(questions);
    }
    return questions.length;
  }
};

const mapAnswerToNumber = (type, ans) => {
  if (type === "Descriptive" || type === "Coding") return 0;

  switch (ans) {
    case "A": return 1;
    case "B": return 2;
    case "C": return 3;
    case "D": return 4;
    default: return 0;
  }
};

module.exports = Question;