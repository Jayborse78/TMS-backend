const db = require("../../DB/knex");

const Certificate = {

  getAll: async () => {
    return db("tg_certificate as c")
      .leftJoin("tg_training_list as cr", "c.training_id", "cr.id")
      .select(
        "c.id",
        "c.training_id",
        "cr.name",
        "cr.training_type",
        "c.status",
        "c.template_name",
        "c.template_path",
      )
      .where("c.is_deleted", 0).orderBy("c.created_date", "desc");
  },

  create: async (data) => {
    const [id] = await db("tg_certificate").insert({
      training_id: data.training_id,
      status: data.status === 0 ? 0 : 1,
      template_name: data.template_name,
      template_path: data.template_path,
      created_by: data.created_by,
    });
    return id;
  },

  update: async (id, data) => {
    const updateObj = {
      training_id: data.training_id,
    };

    // Only update template fields if they are explicitly provided
    if (data.template_name !== undefined) {
      updateObj.template_name = data.template_name;
    }
    if (data.template_path !== undefined) {
      updateObj.template_path = data.template_path;
    }
    if (data.status !== undefined) {
      updateObj.status = data.status === 0 ? 0 : 1;
    }

    await db("tg_certificate").where({ id }).update(updateObj);
  },

  // helper used by controller validation
  findByTraining: async (trainingId) => {
    return db("tg_certificate")
      .where({ training_id: trainingId, is_deleted: 0 })
      .first();
  },

  delete: async (id) => {
    await db("tg_certificate")
      .where({ id })
      .update({ is_deleted: 1 });
  },
};

module.exports = Certificate;