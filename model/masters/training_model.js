const db = require("../../DB/knex");

const hasTrainerIdColumn = () => db.schema.hasColumn("tg_training_list", "trainer_id");
const hasTrainerNameColumn = () => db.schema.hasColumn("tg_training_list", "trainer_name");

const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

// Map status strings to integer values for database storage
const statusMap = {
  'upcoming': 0,
  'running': 1,
  'completed': 2
};

// Reverse status mapping from integer to string
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

const Training = {
  
  getByTrainerId : async (id) => {
    return db("tg_training_list")
      .where({ trainer_id: id, is_deleted: 0 })
      .orderBy("created_date", "desc")
      .select("*")
      .then(rows => rows.map(row => ({
        ...row,
        status: statusReverseMap[row.status] || 'upcoming',
        courses: parseJsonArray(row.courses),
        employees: parseJsonArray(row.employees)
      })));
  },
  
  getAll: async () => {
    const hasTrainerId = await hasTrainerIdColumn();
    const hasTrainerName = await hasTrainerNameColumn();

    let query = db("tg_training_list as t")
      .where({ "t.is_deleted": 0 })
      .orderBy("t.created_date", "desc");

    if (hasTrainerId) {
      query = query.leftJoin("tg_ad_users as u", "t.trainer_id", "u.id");
      if (hasTrainerName) {
        query = query.select("t.*", db.raw("COALESCE(u.name, t.trainer_name) as trainer_display_name"));
      } else {
        query = query.select("t.*", "u.name as trainer_display_name");
      }
    } else {
      query = query.select("t.*");
    }

    const rows = await query;
    
    // Convert status integers back to strings
    return rows.map(row => ({
      ...row,
      trainer_name: row.trainer_display_name || row.trainer_name || "",
      status: statusReverseMap[row.status] || 'upcoming',
      courses: parseJsonArray(row.courses),
      employees: parseJsonArray(row.employees)
    }));
  },

  create: async (data) => {
    const hasTrainerId = await hasTrainerIdColumn();
    const hasTrainerName = await hasTrainerNameColumn();
    if (!hasTrainerId) {
      throw new Error("TRAINER_ID_COLUMN_MISSING");
    }
    const trainerId = toNullableNumber(data.trainerId ?? data.trainer_id);

    const payload = {
      training_code: data.trainingCode,
      name: data.trainingName,
      department: data.department,
      training_date: data.date,
      end_date: data.endDate,
      start_time: data.startTime,
      end_time: data.endTime,
      training_type: data.trainingType,
      venue: data.venue,
      meeting_link: data.meetingLink,
      description: data.description,
      status: statusMap[data.status] || statusMap['upcoming'],
      courses: data.courses ? JSON.stringify(data.courses) : JSON.stringify([]),
      employees: data.employees ? JSON.stringify(data.employees) : JSON.stringify([]),
      created_by: 1,
      trainer_id: trainerId,
    };

    if (hasTrainerName) {
      // Keep legacy column non-empty for schemas where trainer_name is NOT NULL.
      payload.trainer_name = data.trainerName || "";
    }

    const [id] = await db("tg_training_list").insert(payload);

    return id;
  },

  update: async (id, data) => {
    const hasTrainerId = await hasTrainerIdColumn();
    const hasTrainerName = await hasTrainerNameColumn();
    if (!hasTrainerId) {
      throw new Error("TRAINER_ID_COLUMN_MISSING");
    }
    const trainerId = toNullableNumber(data.trainerId ?? data.trainer_id);

    const payload = {
        training_code: data.trainingCode,
        name: data.trainingName,
        department: data.department,
        training_date: data.date,
        end_date: data.endDate,
        start_time: data.startTime,
        end_time: data.endTime,
        training_type: data.trainingType,
        venue: data.venue,
        meeting_link: data.meetingLink,
        description: data.description,
        status: statusMap[data.status] || statusMap['upcoming'],
        courses: data.courses ? JSON.stringify(data.courses) : JSON.stringify([]),
        employees: data.employees ? JSON.stringify(data.employees) : JSON.stringify([]),
        updated_by: 1,
        trainer_id: trainerId,
      };

    if (hasTrainerName) {
      payload.trainer_name = data.trainerName || "";
    }

    return db("tg_training_list")
      .where({ id })
      .update(payload);
  },

  delete: async (id) => {
    return db("tg_training_list")
      .where({ id })
      .update({ is_deleted: 1 });
  }

};

module.exports = Training;