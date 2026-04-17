/**
 * Migration to add skill_id column to tg_courses table.
 */

const db = require("../DB/knex");

async function up() {
  const has = await db.schema.hasColumn("tg_courses", "skill_id");
  if (!has) {
    await db.schema.table("tg_courses", (table) => {
      table.integer("skill_id").nullable().comment("Mapped skill from tg_skills");
    });
  }
}

async function down() {
  const has = await db.schema.hasColumn("tg_courses", "skill_id");
  if (has) {
    await db.schema.table("tg_courses", (table) => {
      table.dropColumn("skill_id");
    });
  }
}

module.exports = { up, down };
