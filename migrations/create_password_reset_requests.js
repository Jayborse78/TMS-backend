const db = require("../DB/knex");

async function up() {
  try {
    const tableExists = await db.schema.hasTable("tg_password_reset_requests");

    if (tableExists) {
      console.log("ℹ️ tg_password_reset_requests table already exists");
      return true;
    }

    await db.schema.createTable("tg_password_reset_requests", (table) => {
      table.increments("id").primary();
      table.integer("user_id").notNullable();
      table.enu("status", ["pending", "approved", "rejected"]).notNullable().defaultTo("pending");
      table.timestamp("requested_at").defaultTo(db.fn.now());
      table.timestamp("approved_at").nullable();
      table.integer("approved_by").nullable();
      table.string("temp_password", 64).nullable();
      table.integer("created_by").nullable();
      table.integer("updated_by").nullable();
      table.timestamp("created_date").defaultTo(db.fn.now());
      table.timestamp("updated_date").defaultTo(db.fn.now());
      table.integer("is_deleted").notNullable().defaultTo(0);

      table.index(["user_id", "status"], "idx_pr_user_status");
    });

    console.log("✅ Created tg_password_reset_requests table successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to create tg_password_reset_requests table:", error.message);
    throw error;
  }
}

async function down() {
  try {
    await db.schema.dropTableIfExists("tg_password_reset_requests");
    console.log("⏮️ Dropped tg_password_reset_requests table");
    return true;
  } catch (error) {
    console.error("❌ Rollback failed:", error.message);
    throw error;
  }
}

module.exports = { up, down };
