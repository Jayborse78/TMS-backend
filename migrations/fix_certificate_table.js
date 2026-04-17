/**
 * Migration to fix tg_certificate table schema
 * - Remove any rows with id = 0
 * - Set id as AUTO_INCREMENT PRIMARY KEY
 * - Reset AUTO_INCREMENT counter
 */

const db = require("../DB/knex");

async function up() {
  try {
    console.log("🔧 Running migration: fix_certificate_table...");

    // Step 1: Remove any rows with id = 0
    console.log("  ✓ Removing rows with id = 0...");
    await db("tg_certificate").where({ id: 0 }).del();

    // Step 2: Drop existing primary key if it exists, then recreate it
    console.log("  ✓ Checking table structure...");
    try {
      // First try to drop the existing constraint
      await db.raw(`ALTER TABLE tg_certificate DROP PRIMARY KEY`);
      console.log("  ✓ Dropped existing primary key");
    } catch (e) {
      // If no primary key exists, that's fine
      console.log("  ℹ No existing primary key to drop");
    }

    // Now add the auto-increment primary key
    await db.raw(
      `ALTER TABLE tg_certificate
       MODIFY id INT NOT NULL AUTO_INCREMENT,
       ADD PRIMARY KEY (id)`
    );
    console.log("  ✓ Table schema updated with AUTO_INCREMENT");

    // Step 3: Reset AUTO_INCREMENT to 1
    console.log("  ✓ Resetting AUTO_INCREMENT counter...");
    await db.raw("ALTER TABLE tg_certificate AUTO_INCREMENT = 1");

    // Step 4: Verify the fix
    const result = await db("tg_certificate").select("id").orderBy("id", "desc").limit(1);
    const nextId = result.length > 0 ? result[0].id + 1 : 1;

    console.log(`✅ Migration completed successfully!`);
    console.log(`   Next certificate ID will be: ${nextId}`);

    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
}

async function down() {
  console.log("⏮️  Rollback not supported for this migration");
}

module.exports = { up, down };
