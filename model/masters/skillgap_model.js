const db = require('../../DB/knex');

const parseDeptIds = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .map((id) => Number(String(id).trim()))
        .filter((id) => Number.isInteger(id) && id > 0)
    )];
  }

  if (value === undefined || value === null || value === '') {
    return [];
  }

  return [...new Set(
    String(value)
      .split(',')
      .map((id) => Number(String(id).trim()))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
};

const resolvePrimaryDeptId = (preferredDeptId, userDeptValue) => {
  const preferred = parseDeptIds(preferredDeptId);
  if (preferred.length > 0) return preferred[0];

  const userDeptIds = parseDeptIds(userDeptValue);
  return userDeptIds.length > 0 ? userDeptIds[0] : null;
};

const normalizeSkillNames = (skillNames) => {
  const source = Array.isArray(skillNames) ? skillNames : [skillNames];
  return [...new Set(source.map((skill) => String(skill || '').trim()).filter(Boolean))];
};

const normalizeSkillKey = (value) => String(value || '').trim().toLowerCase();

const uniqSkillLabels = (skills) => {
  const seen = new Set();
  const result = [];

  (Array.isArray(skills) ? skills : []).forEach((skill) => {
    const label = String(skill || '').trim();
    if (!label) return;

    const key = normalizeSkillKey(label);
    if (seen.has(key)) return;

    seen.add(key);
    result.push(label);
  });

  return result;
};

const resolveSkillDeptRows = async ({ skillNames, userDeptValue, fallbackDeptId }) => {
  const normalizedSkills = normalizeSkillNames(skillNames);
  if (normalizedSkills.length === 0) return [];

  const allowedDeptIds = parseDeptIds(userDeptValue);
  const fallback = resolvePrimaryDeptId(fallbackDeptId, userDeptValue);

  let scopedRowsQuery = db('tg_skills')
    .whereIn('skill_name', normalizedSkills)
    .andWhere('is_deleted', 0)
    .select('skill_name', 'dept_id');

  if (allowedDeptIds.length > 0) {
    scopedRowsQuery = scopedRowsQuery.whereIn('dept_id', allowedDeptIds);
  }

  const scopedRows = await scopedRowsQuery;
  const scopedDeptBySkill = {};
  scopedRows.forEach((row) => {
    if (!scopedDeptBySkill[row.skill_name]) {
      scopedDeptBySkill[row.skill_name] = row.dept_id;
    }
  });

  const missingSkills = normalizedSkills.filter((skill) => !scopedDeptBySkill[skill]);
  let globalDeptBySkill = {};

  if (missingSkills.length > 0) {
    const globalRows = await db('tg_skills')
      .whereIn('skill_name', missingSkills)
      .andWhere('is_deleted', 0)
      .select('skill_name', 'dept_id');

    globalRows.forEach((row) => {
      if (!globalDeptBySkill[row.skill_name]) {
        globalDeptBySkill[row.skill_name] = row.dept_id;
      }
    });
  }

  return normalizedSkills.map((skill) => ({
    skill,
    deptId: scopedDeptBySkill[skill] || globalDeptBySkill[skill] || fallback || null,
  }));
};

const resolveEmployee = async (employeeIdentifier) => {
  if (employeeIdentifier === undefined || employeeIdentifier === null || employeeIdentifier === '') {
    return null;
  }

  const user = await db('tg_ad_users')
    .where('is_deleted', 0)
    .andWhere(function () {
      this.where('id', employeeIdentifier).orWhere('emp_id', employeeIdentifier);
    })
    .first('id', 'emp_id', 'dept_id');

  return user || null;
};

const SkillGap = {
  /**
   * Return aggregated skill gap rows grouped by employee.
   * Each object will include employee info, skills array, requiredSkills array
   * and a computed skillGap percentage.
   */
  getAll: async () => {
    // fetch raw rows with user info
    const rows = await db('tg_skillgap as sg')
      .leftJoin('tg_ad_users as u', function () {
        this.on('sg.emp_id', '=', 'u.id').orOn('sg.emp_id', '=', 'u.emp_id');
      })
      .leftJoin('tg_roles as r', 'u.role_id', 'r.id')
      .select(
        'sg.emp_id',
        'sg.dept_id',
        'sg.skills',
        'sg.status',
        'u.id as userId',
        'u.emp_id as employeeCode',
        'u.name',
        'u.email',
        'u.dept_id as userDeptId',
        'r.role_name as role'
      )
      .where('sg.is_deleted', 0).orderBy('sg.created_date', 'desc');

    const departments = await db('tg_department')
      .where('is_deleted', 0)
      .select('id', 'dept_name');

    const deptNameById = {};
    departments.forEach((dept) => {
      deptNameById[Number(dept.id)] = dept.dept_name;
    });

    // group by employee id
    const grouped = {};
    rows.forEach((r) => {
      const canonicalEmpId = r.userId || r.emp_id;
      const key = canonicalEmpId;
      if (!grouped[key]) {
        // Always consider all user departments; include assessment dept for compatibility.
        const deptIds = [...new Set([
          ...parseDeptIds(r.userDeptId),
          ...parseDeptIds(r.dept_id),
        ])];
        const department = deptIds
          .map((id) => deptNameById[id])
          .filter(Boolean)
          .join(', ');

        grouped[key] = {
          id: canonicalEmpId,
          emp_id: canonicalEmpId,
          employeeId: r.employeeCode || r.emp_id || '',
          employeeName: r.name || '',
          email: r.email || '',
          role: r.role || '',
          department,
          deptIds,
          deptId: deptIds[0] || null,
          skills: [],
          status: r.status,
        };
      }
      // push the skill string if present
      if (r.skills) grouped[key].skills.push(r.skills);
    });

    const result = Object.values(grouped);

    // build list of department ids and fetch required skills in one shot
    const deptIds = [...new Set(result.flatMap((i) => i.deptIds || []).filter(Boolean))];
    let skillsByDept = {};
    if (deptIds.length) {
      const skillRows = await db('tg_skills')
        .whereIn('dept_id', deptIds)
        .andWhere('is_deleted', 0)
        .select('dept_id', 'skill_name');

      skillRows.forEach((s) => {
        if (!skillsByDept[s.dept_id]) skillsByDept[s.dept_id] = [];
        skillsByDept[s.dept_id].push(s.skill_name);
      });
    }

    // compute required skills and gap percentage
    const normalized = result.map((item) => {
      const required = uniqSkillLabels(
        (item.deptIds || []).flatMap((deptId) => skillsByDept[deptId] || []),
      );
      const requiredSkillSet = new Set(required.map(normalizeSkillKey));
      const currentRaw = uniqSkillLabels(item.skills || []);
      const current = currentRaw.filter((skill) => requiredSkillSet.has(normalizeSkillKey(skill)));
      const gap = required.length
        ? Math.round(((required.length - current.length) / required.length) * 100)
        : 0;

      return {
        ...item,
        requiredSkills: required,
        currentSkills: current,
        skillGap: gap,
      };
    });

    return normalized;
  },

  /**
   * Inserts a new skill gap record(s) for an employee.
   * `skill_names` may be an array of strings or a single string.
   */
  create: async ({ emp_id, dept_id, skill_names, created_by }) => {
    const user = await resolveEmployee(emp_id);
    const resolvedEmpId = user?.id || emp_id;
    const resolvedDeptId = resolvePrimaryDeptId(dept_id, user?.dept_id);
    const skillDeptRows = await resolveSkillDeptRows({
      skillNames: skill_names,
      userDeptValue: user?.dept_id,
      fallbackDeptId: dept_id,
    });

    const inserts = skillDeptRows.length
      ? skillDeptRows.map(({ skill, deptId }) => ({
          emp_id: resolvedEmpId,
          dept_id: deptId,
          skills: skill,
          status: 1,
          is_deleted: 0,
          created_by: created_by || '',
        }))
      : [{
          emp_id: resolvedEmpId,
          dept_id: resolvedDeptId,
          skills: '',
          status: 1,
          is_deleted: 0,
          created_by: created_by || '',
        }];
    return db('tg_skillgap').insert(inserts);
  },

  /**
   * Overwrite the skills for an employee by soft-deleting existing rows
   * and inserting the new list.  This is used when the front-end updates
   * an assessment.
   */
  update: async ({ emp_id, dept_id, skill_names, updated_by }) => {
    const user = await resolveEmployee(emp_id);
    const resolvedEmpId = user?.id || emp_id;
    const resolvedDeptId = resolvePrimaryDeptId(dept_id, user?.dept_id);
    const skillDeptRows = await resolveSkillDeptRows({
      skillNames: skill_names,
      userDeptValue: user?.dept_id,
      fallbackDeptId: dept_id,
    });

    // mark previous entries as deleted
    await db('tg_skillgap')
      .where({ emp_id: resolvedEmpId, is_deleted: 0 })
      .update({ is_deleted: 1, updated_by: updated_by || '', updated_date: new Date() });

    // insert fresh rows
    const inserts = skillDeptRows.length
      ? skillDeptRows.map(({ skill, deptId }) => ({
          emp_id: resolvedEmpId,
          dept_id: deptId,
          skills: skill,
          status: 1,
          is_deleted: 0,
          created_by: updated_by || '',
        }))
      : [{
          emp_id: resolvedEmpId,
          dept_id: resolvedDeptId,
          skills: '',
          status: 1,
          is_deleted: 0,
          created_by: updated_by || '',
        }];
    return db('tg_skillgap').insert(inserts);
  },

  /**
   * Soft-delete all skill gap records for an employee.
   */
  deleteByEmployee: async (emp_id) => {
    const user = await resolveEmployee(emp_id);
    const resolvedEmpId = user?.id || emp_id;

    return db('tg_skillgap')
      .where('is_deleted', 0)
      .andWhere(function () {
        this.where('emp_id', resolvedEmpId);
        if (String(resolvedEmpId) !== String(emp_id)) {
          this.orWhere('emp_id', emp_id);
        }
      })
      .update({ is_deleted: 1 });
  },

  /**
   * Return list of skill rows for a given department id
   */
  getSkillsByDepartment: (deptId) => {
    const deptIds = parseDeptIds(deptId);

    if (deptIds.length === 0) {
      return Promise.resolve([]);
    }

    return db('tg_skills')
      .whereIn('dept_id', deptIds)
      .andWhere('is_deleted', 0)
      .distinct('skill_name');
  },
};

module.exports = SkillGap;
