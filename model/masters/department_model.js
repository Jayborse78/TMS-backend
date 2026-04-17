const db=require('../../DB/knex');

const departmentModel={
    
    getallDepartments: () => {
    return db('tg_department')
      .select('*')
      .where({ is_deleted: 0 }).orderBy('created_date', 'desc');
},

getDepartmentById: (Id) => {
  return db('tg_department')
    .select('*')
    .where({ id: Id, is_deleted: 0 });
},

    createDepartment: (dept_code, dept_name, dept_desc, status, created_by) => {
  return db('tg_department').insert({
    dept_code,
    dept_name,
    dept_desc,
    status: status === 0 ? 0 : 1,
    created_by,
    created_date: db.fn.now()
  });
},

updateDepartment: (Id, dept_code, dept_name, dept_desc, updated_by, status) => {
  const payload = {
    dept_code,
    dept_name,
    dept_desc,
    updated_by,
    updated_date: db.fn.now(),
  };

  if (status !== undefined) {
    payload.status = status === 0 ? 0 : 1;
  }

  return db('tg_department')
    // .where({ id: Id })
    .where({ id: Id, is_deleted: 0 })
    .update(payload);
},


    deleteDepartment:(Id)=>{
        return db('tg_department')
            // .where({id: Id})
            .where({ id: Id, is_deleted: 0 })
            .update({
                is_deleted:1
            });
    }       
}

module.exports = departmentModel;