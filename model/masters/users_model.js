const db = require('../../DB/knex');

const normalizeDeptIds = (deptIds, fallbackDeptId) => {
  const source = Array.isArray(deptIds)
    ? deptIds
    : typeof deptIds === 'string'
      ? deptIds.split(',')
      : [];

  const ids = [...new Set(
    source
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];

  if (ids.length > 0) return ids;

  const fallback = Number(fallbackDeptId);
  if (Number.isInteger(fallback) && fallback > 0) {
    return [fallback];
  }

  return [];
};

const toDeptCsv = (deptIds, fallbackDeptId) => {
  const ids = normalizeDeptIds(deptIds, fallbackDeptId);
  return ids.length > 0 ? ids.join(',') : null;
};

const parseDeptCsv = (deptCsv) => {
  if (!deptCsv && deptCsv !== 0) return [];
  return String(deptCsv)
    .split(',')
    .map((id) => Number(String(id).trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const usermodel = {

  getAllUsers: async () => {
    const users = await db('tg_ad_users as u')
      .leftJoin('tg_roles as r', 'u.role_id', 'r.id')
      .select(
        'u.id',
        'u.emp_id',
        'u.name',
        'u.email',
        'u.education',
        'u.username',
        'u.password',
        'u.experience',
        'u.status',
        'u.role_id',
        'u.dept_id',
        'r.role_name'
      )
      .where('u.is_deleted', 0,)
      .orderBy('u.created_date', 'desc');

    if (users.length === 0) {
      return users;
    }

    const allDepts = await db('tg_department')
      .select('id', 'dept_name')
      .where({ is_deleted: 0 });

    const deptNameById = {};
    allDepts.forEach((dept) => {
      deptNameById[Number(dept.id)] = dept.dept_name;
    });

    return users.map((user) => {
      const deptIds = parseDeptCsv(user.dept_id);
      const department = deptIds
        .map((id) => deptNameById[id])
        .filter(Boolean)
        .join(', ');

      return {
        ...user,
        dept_ids: deptIds,
        department,
      };
    });
  },

  createUser: (data) => {
    const insertData = { ...data };
    insertData.dept_id = toDeptCsv(data.dept_ids, data.dept_id);
    delete insertData.dept_ids;
    console.log("Inserting user with data:", insertData);
    return db('tg_ad_users').insert(insertData);
  },

  updateUser: (id, data) => {
    const updateData = { ...data };
    updateData.dept_id = toDeptCsv(data.dept_ids, data.dept_id);
    delete updateData.dept_ids;
     console.log("Updating user with data:", updateData);
    return db('tg_ad_users')
      .where({ id })
      .update(updateData);
  },

  deleteUser: (id) => {
    return db('tg_ad_users')
      .where({ id })
      .update({ is_deleted: 1 });
  }

};






module.exports = usermodel;
