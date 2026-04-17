const db = require("../DB/knex");

async function up() {
  const hasMappingTable = await db.schema.hasTable("tg_course_skills");
  if (hasMappingTable) {
    await db.schema.dropTable("tg_course_skills");
  }

  const hasSkillId = await db.schema.hasColumn("tg_courses", "skill_id");
  if (hasSkillId) {
    await db.raw("ALTER TABLE tg_courses MODIFY COLUMN skill_id VARCHAR(255) NULL");
  }
}

async function down() {
  const hasSkillId = await db.schema.hasColumn("tg_courses", "skill_id");
  if (hasSkillId) {
    await db.raw("ALTER TABLE tg_courses MODIFY COLUMN skill_id INT(11) NULL");
  }

  const hasMappingTable = await db.schema.hasTable("tg_course_skills");
  if (!hasMappingTable) {
    await db.schema.createTable("tg_course_skills", (table) => {
      table.increments("id").primary();
      table.integer("course_id").notNullable();
      table.integer("skill_id").notNullable();
      table.dateTime("created_date").defaultTo(db.fn.now());
      table.index(["course_id"]);
      table.index(["skill_id"]);
      table.unique(["course_id", "skill_id"]);
    });
  }
}

module.exports = { up, down };
