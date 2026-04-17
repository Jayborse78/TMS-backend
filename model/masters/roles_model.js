const db=require('../../DB/knex');

const rolemodel={
    getallroles:()=>{
        return db.select('*').from('tg_roles').where({is_deleted: 0}).orderBy('created_date', 'desc');
    },

    getRoleById:(Id)=>{
        return db.select('*').from('tg_roles').where({ id: Id, is_deleted: 0 })
.first();
    },

    createRole:(role_id, role_name, role_description, status, created_by)=>{
        return db('tg_roles').insert({
            role_id,
            role_name,
            role_description,
            status: status === 0 ? 0 : 1,
            created_by
        });
    },

    updateRole:(id,role_id, role_name, role_description, status, updated_by, updated_date)=>{
        const payload = { role_id, role_name, role_description, updated_by, updated_date };

        if (status !== undefined) {
            payload.status = status === 0 ? 0 : 1;
        }

        return db('tg_roles').where({id: id}).update(payload);
    },

    deleteRole:(Id)=>{
        return db('tg_roles').where({ id: Id, is_deleted: 0 })
.update({ is_deleted: 1 });
    }
}

module.exports = rolemodel;