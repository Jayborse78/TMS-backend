exports.up = function(knex) {
  return knex.schema.createTable('tg_training_progress', function(table) {
    table.increments('id').primary();
    table.integer('employee_id').notNullable();
    table.integer('course_id').notNullable();
    table.integer('training_id').notNullable();
    table.integer('progress').notNullable().defaultTo(0); // 0-100
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['employee_id', 'course_id', 'training_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('tg_training_progress');
};
