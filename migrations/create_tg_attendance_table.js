// Migration to create tg_attendance table

exports.up = function(knex) {
  return knex.schema.createTable('tg_attendance', function(table) {
    table.increments('id').primary();
    table.integer('training_id').notNullable();
    table.integer('user_id').notNullable();
    table.integer('is_attended').defaultTo(0);
    table.string('attendance_status').defaultTo('1');
    // Add indexes if needed
    table.index(['training_id', 'user_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('tg_attendance');
};
