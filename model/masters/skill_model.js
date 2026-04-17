const db = require('../../DB/knex');

const skillmodel = {
  getallskills: () => {
    return db.select('*').from('tg_skills').where({ is_deleted: 0 }).orderBy('created_date', 'desc');
  },

  getSkillById: (id) => {
    return db.select('*').from('tg_skills').where({ id }).first();
  },

  createSkill: (
    role_id,
    dept_id,
    skill_code,
    skill_name,
    skill_cat,
    skill_dept,
    skill_desc,
    status,
    created_by
  ) => {
    return db('tg_skills').insert({
      role_id,
      dept_id,
      skill_code,
      skill_name,
      skill_cat,
      skill_dept,
      skill_desc,
      status: status === 0 ? 0 : 1,
      created_by
    });
  },

  updateSkill: (
    id,
    role_id,
    dept_id,
    skill_code,
    skill_name,
    skill_cat,
    skill_dept,
    skill_desc,
    status,
    updated_by,
    updated_date
  ) => {
    const payload = {
      role_id,
      dept_id,
      skill_code,
      skill_name,
      skill_cat,
      skill_dept,
      skill_desc,
      updated_by,
      updated_date
    };

    if (status !== undefined) {
      payload.status = status === 0 ? 0 : 1;
    }

    return db('tg_skills').where({ id }).update(payload);
  },

  deleteSkill: (id) => {
    return db('tg_skills').where({ id }).update({ is_deleted: 1 });
  }
};

module.exports = skillmodel;
