const db = require('../../DB/knex');


// Returns global admin dashboard counts
const getAdminDashboardCounts = async (req, res) => {
  try {
    // Employees (by role_name)
    const employees = await db('tg_ad_users')
      .join('tg_roles', 'tg_ad_users.role_id', '=', 'tg_roles.id')
      .where('tg_ad_users.is_deleted', 0)
      .andWhere('tg_roles.role_name', 'Employee')
      .count('tg_ad_users.id as total');

    // Trainers (by role_name)
    const trainers = await db('tg_ad_users')
      .join('tg_roles', 'tg_ad_users.role_id', '=', 'tg_roles.id')
      .where('tg_ad_users.is_deleted', 0)
      .andWhere('tg_roles.role_name', 'Trainer')
      .count('tg_ad_users.id as total');

    // Trainings
    const trainings = await db('tg_training_list').where({ is_deleted: 0 }).count('id as total');

    // Ongoing Trainings
    const ongoingTrainings = await db('tg_training_list').where({ is_deleted: 0, status: 0 }).count('id as total');

    // Completed Trainings
    const completedTrainings = await db('tg_training_list').where({ is_deleted: 0, status: 2 }).count('id as total');
    
    // Users
    const users = await db('tg_ad_users').where({ is_deleted: 0 }).count('id as total');

    return res.json({
      totalEmployees: Number(employees[0].total),
      totalTrainers: Number(trainers[0].total),
      totalTrainings: Number(trainings[0].total),
      ongoingTrainings: Number(ongoingTrainings[0].total),
      completedTrainings: Number(completedTrainings[0].total),
      totalUsers: Number(users[0].total)
    });
  } catch (error) {
    console.error('Admin dashboard counts error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getTrainerDashboardCounts = async (req, res) => {
  try {
    const trainerId = req.user.id; 
    // My Trainings
    const myTrainings = await db('tg_training_list')
      .where({ is_deleted: 0 , trainer_id: trainerId })
      .count('id as total');

    // Upcoming Sessions
    const upcomingSessions = await db('tg_training_list')
      .where({ is_deleted: 0, status: 0  , trainer_id: trainerId })
      .count('id as total');

    // Completed Trainings
    const completedTrainings = await db('tg_training_list')
      .where({ is_deleted: 0, status: 2, trainer_id: trainerId })
      .count('id as total');


    return res.json({
      myTrainings: Number(myTrainings[0].total),
      upcomingSessions: Number(upcomingSessions[0].total),
      completedTrainings: Number(completedTrainings[0].total)
    });
  } catch (error) {
    console.error('Trainer dashboard counts error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAdminDashboardCounts, getTrainerDashboardCounts };
