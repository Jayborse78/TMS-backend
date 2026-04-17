// Migration for tg_exam_schedule table

exports.up = function(knex) {
  return knex.schema.createTable('tg_exam_schedule', function(table) {
    table.increments('id').primary();
    table.integer('exam_id').unsigned().notNullable();
    table.integer('employee_id').unsigned().notNullable();
    table.dateTime('scheduled_date').notNullable();
    table.string('status', 30).defaultTo('scheduled');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').nullable();
    table.unique(['exam_id', 'employee_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('tg_exam_schedule');
};
