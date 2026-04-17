const db=require('../../DB/knex');
const { get } = require('../../Routes/masters/department_route');

const Auth={
   getRoleByUsername: (usernameOrEmail, password) => {
  return db('tg_ad_users as u')
    .join('tg_roles as r', 'u.role_id', 'r.id')
    .select('u.id', 'u.email', 'u.role_id', 'r.role_name')
    .where({
      'u.password': password,
        'u.is_deleted': 0,
    })
    .andWhere(function () {
      this.where('u.username', usernameOrEmail).orWhere('u.email', usernameOrEmail);
    })
    .first();
}

   
}


module.exports = Auth;