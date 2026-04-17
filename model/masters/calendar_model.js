const db = require("../../DB/knex");

const TrainingCalendar = {
  getUpcomingSessions: async (trainerId) => {
    return db("tg_training_list as c")
      .select(
        "c.id",
        "c.name",
        "c.training_type",
        'c.training_date',
        'c.end_date',
        'c.start_time',
        'c.end_time',
        'c.trainer_id',
        "c.status",
      db.raw(`CASE 
          WHEN c.status = 2 THEN 'Completed'
          WHEN c.status = 1 OR (c.status = 0 AND DATE(c.training_date) = CURDATE()) THEN 'Running'
          WHEN c.status = 0 AND DATE(c.training_date) > CURDATE() THEN 'Upcoming'
          WHEN c.status = 0 AND DATE(c.training_date) < CURDATE() THEN 'Expired'
          ELSE 'Unknown'
        END as status_text`),
    )
      .where("c.trainer_id", trainerId)
      .andWhere("c.is_deleted", 0)
      .andWhere(function() {
        this.where("c.status", 0) // Running
          .orWhere(function() {
            this.where("c.status", 0)
              .andWhereRaw("DATE(c.training_date) = CURDATE() OR DATE(c.training_date) > CURDATE()") // Upcoming or today only
          });
      })
      .orderBy("c.created_date", "desc");
    }};

module.exports = TrainingCalendar;
