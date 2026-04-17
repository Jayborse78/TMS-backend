// Migration to add dept_id column to tg_skillgap table

exports.up = async function (db) {
  const has = await db.schema.hasColumn('tg_skillgap', 'dept_id');
  if (!has) {
    await db.schema.table('tg_skillgap', (table) => {
      table.integer('dept_id').nullable().comment('department of the employee at time of assessment');
    });
  }
};

exports.down = async function (db) {
  const has = await db.schema.hasColumn('tg_skillgap', 'dept_id');
  if (has) {
    await db.schema.table('tg_skillgap', (table) => {
      table.dropColumn('dept_id');
    });
  }
};
