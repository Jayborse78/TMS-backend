const db=require("../../DB/knex");

const Profile = {

  getProfileById:(id) => {
    return db("tg_ad_users as u")
      .leftJoin("tg_roles as r", "u.role_id", "r.id")
      .leftJoin("tg_department as d", "u.dept_id", "d.id")
      .select("u.*", "r.role_name", "d.dept_name as department")
      .where("u.id", id)
      .andWhere("u.is_deleted", 0)
      .first();
  },

  updateProfileById: (id, data) => {
    return db("tg_ad_users")
      .where("id", id)
      .andWhere("is_deleted", 0)
      .update(data);
  }
}
module.exports=Profile;