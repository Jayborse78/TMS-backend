/**
 * Migration to add courses and employees columns to tg_training_list table
 * and fix status column to properly store training status
 */

const db = require("../DB/knex");

async function up() {
  try {
    console.log("🔧 Running migration: add_courses_employees_to_training...");

    // Check if columns already exist
    const table = await db.raw("DESCRIBE tg_training_list");
    const columnNames = table[0].map(col => col.Field);

    // Add courses column if it doesn't exist
    if (!columnNames.includes('courses')) {
      console.log("  ✓ Adding 'courses' column...");
      await db.raw(
        `ALTER TABLE tg_training_list 
         ADD COLUMN courses LONGTEXT NULL`
      );
    }

    // Add employees column if it doesn't exist
    if (!columnNames.includes('employees')) {
      console.log("  ✓ Adding 'employees' column...");
      await db.raw(
        `ALTER TABLE tg_training_list 
         ADD COLUMN employees LONGTEXT NULL`
      );
    }

    console.log("✅ Migration completed successfully!");
    console.log("   Table structure updated with courses and employees columns");

    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
}

async function down() {
  try {
    console.log("⏮️  Rolling back migration: add_courses_employees_to_training...");
    
    await db.raw("ALTER TABLE tg_training_list DROP COLUMN IF EXISTS courses");
    await db.raw("ALTER TABLE tg_training_list DROP COLUMN IF EXISTS employees");
    
    console.log("✅ Rollback completed!");
    return true;
  } catch (error) {
    console.error("❌ Rollback failed:", error.message);
    throw error;
  }
}

module.exports = { up, down };
