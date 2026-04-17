const db = require("../../DB/knex");

const PasswordResetModel = {
  findUserByUsernameOrEmail: (usernameOrEmail) => {
    return db("tg_ad_users")
      .select("id", "name", "username", "email", "role_id")
      .where("is_deleted", 0)
      .andWhere(function () {
        this.where("username", usernameOrEmail).orWhere("email", usernameOrEmail);
      })
      .first();
  },

  hasPendingRequest: (userId) => {
    return db("tg_password_reset_requests")
      .where({ user_id: userId, status: "pending", is_deleted: 0 })
      .first();
  },

  createRequest: (payload) => {
    return db("tg_password_reset_requests").insert(payload);
  },

  markRequestDeleted: (id, updatedBy) => {
    return db("tg_password_reset_requests")
      .where({ id })
      .update({
        is_deleted: 1,
        updated_by: updatedBy,
        updated_date: new Date(),
      });
  },

  getPendingRequests: () => {
    return db("tg_password_reset_requests as pr")
      .join("tg_ad_users as u", "pr.user_id", "u.id")
      .select(
        "pr.id",
        "pr.user_id",
        "u.name",
        "u.username",
        "u.email",
        "pr.status",
        "pr.requested_at"
      )
      .where({ "pr.status": "pending", "pr.is_deleted": 0 })
      .orderBy("pr.requested_at", "desc");
  },

  getRequestById: (id) => {
    return db("tg_password_reset_requests as pr")
      .join("tg_ad_users as u", "pr.user_id", "u.id")
      .select(
        "pr.id",
        "pr.user_id",
        "pr.status",
        "u.name",
        "u.username",
        "u.email"
      )
      .where({ "pr.id": id, "pr.is_deleted": 0 })
      .first();
  },

  approveRequest: (id, payload) => {
    return db("tg_password_reset_requests")
      .where({ id, status: "pending", is_deleted: 0 })
      .update(payload);
  },

  updateUserPassword: (userId, password) => {
    return db("tg_ad_users").where({ id: userId }).update({
      password,
      updated_date: new Date(),
    });
  },

  getUserPasswordById: (userId) => {
    return db("tg_ad_users").select("password").where({ id: userId }).first();
  },

  getAdminEmails: () => {
    return db("tg_ad_users as u")
      .leftJoin("tg_roles as r", "u.role_id", "r.id")
      .distinct("u.email")
      .where("u.is_deleted", 0)
      .whereNotNull("u.email")
      .andWhere(function () {
        this.where("u.role_id", 2).orWhereRaw("LOWER(r.role_name) = ?", ["admin"]);
      });
  },
};

module.exports = PasswordResetModel;
