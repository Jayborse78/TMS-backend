const db = require("../../DB/knex");

const Attendance = {
  // Save attendance for a training session
  saveAttendance: async (data) => {
    try {
      const { training_id, attendees, updated_by } = data;

      if (!training_id || !Array.isArray(attendees)) {
        throw new Error('INVALID_DATA');
      }

      console.log('📊 Saving attendance for training:', training_id);

      // Check if table exists
      const hasTable = await db.schema.hasTable('tg_attendance');
      if (!hasTable) {
        console.error('❌ tg_attendance table does not exist. Run migration first.');
        throw new Error('DATABASE_TABLE_MISSING: tg_attendance table does not exist. Please run migrations.');
      }

      const trainingId = Number(training_id);
      const normalizedAttendees = attendees
        .map((emp) => ({
          user_id: Number(emp?.user_id),
          is_attended: emp?.is_attended ? 1 : 0,
        }))
        .filter((emp) => Number.isFinite(emp.user_id) && emp.user_id > 0);

      if (normalizedAttendees.length === 0) {
        throw new Error('INVALID_DATA');
      }

      let recordsUpdated = 0;
      let recordsSkipped = 0;

      await db.transaction(async (trx) => {
        const userIds = [...new Set(normalizedAttendees.map((emp) => emp.user_id))];

        // Only enrolled rows (attendance_status = 1) are eligible for attendance updates.
        const enrolledRows = await trx('tg_attendance')
          .where({ training_id: trainingId })
          .whereIn('user_id', userIds)
          .andWhere('attendance_status', '1')
          .select('user_id');

        const enrolledUserSet = new Set(
          enrolledRows
            .map((row) => Number(row?.user_id))
            .filter((value) => Number.isFinite(value)),
        );

        for (const emp of normalizedAttendees) {
          if (!enrolledUserSet.has(emp.user_id)) {
            recordsSkipped += 1;
            continue;
          }

          await trx('tg_attendance')
            .where({ training_id: trainingId, user_id: emp.user_id })
            .andWhere('attendance_status', '1')
            .update({
              is_attended: emp.is_attended,
            });

          recordsUpdated += 1;
        }

        // Persist training as completed so it remains in Completed tab after reload
        const trainingUpdatePayload = { status: 2 };
        if (updated_by) trainingUpdatePayload.updated_by = Number(updated_by);

        await trx('tg_training_list')
          .where({ id: trainingId, is_deleted: 0 })
          .update(trainingUpdatePayload);
      });

      console.log('✅ Attendance records updated successfully');

      return {
        success: true,
        message: 'Attendance saved successfully',
        training_id,
        records_saved: recordsUpdated,
        records_skipped: recordsSkipped,
      };
    } catch (error) {
      console.error('❌ Attendance save error:', error.message);
      throw error;
    }
  },

  // Get attendance record for a training
  getAttendanceByTraining: async (training_id) => {
    try {
      const records = await db('tg_attendance').where({ training_id: Number(training_id) });
      return records || [];
    } catch (error) {
      console.error('Get attendance error:', error);
      throw error;
    }
  },

  // Get attendance summary for a training
  getAttendanceSummary: async (training_id) => {
    try {
      const records = await db('tg_attendance').where({ training_id: Number(training_id) });
      
      if (!records || records.length === 0) {
        return { total: 0, present: 0, absent: 0, percentage: 0 };
      }

      const total = records.length;
      const present = records.filter(r => r.is_attended === 1).length;
      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return { total, present, absent, percentage };
    } catch (error) {
      console.error('Get attendance summary error:', error);
      throw error;
    }
  },

  // Get attendance records by user
  getAttendanceByUser: async (user_id) => {
    try {
      const records = await db('tg_attendance')
        .where({ user_id: Number(user_id) });
      
      return records || [];
    } catch (error) {
      console.error('Get user attendance error:', error);
      throw error;
    }
  },

  // Get attendance records for date range
  getAttendanceByDateRange: async (training_id) => {
    try {
      const records = await db('tg_attendance')
        .where({ training_id: Number(training_id) });
      
      return records || [];
    } catch (error) {
      console.error('Get attendance by date range error:', error);
      throw error;
    }
  },

  // Update single attendance record
  updateAttendance: async (training_id, user_id, is_attended) => {
    try {
      const result = await db('tg_attendance')
        .where({ training_id: Number(training_id), user_id: Number(user_id) })
        .update({ 
          is_attended: is_attended ? 1 : 0,
        });
      
      return result > 0;
    } catch (error) {
      console.error('Update attendance error:', error);
      throw error;
    }
  },

  // Delete attendance records
  deleteAttendance: async (training_id) => {
    try {
      const result = await db('tg_attendance').where({ training_id: Number(training_id) }).delete();
      return result;
    } catch (error) {
      console.error('Delete attendance error:', error);
      throw error;
    }
  },

  enrollTraining: async ({ training_id, user_id }) => {
    try {
      const trainingId = Number(training_id);
      const userId = Number(user_id);

      if (!Number.isFinite(trainingId) || !Number.isFinite(userId)) {
        throw new Error('INVALID_DATA');
      }

      const existing = await db('tg_attendance')
        .where({ training_id: trainingId, user_id: userId })
        .first('id');

      if (existing) {
        await db('tg_attendance')
          .where({ id: existing.id })
          .update({
            is_attended: 0,
            attendance_status: '1',
          });
      } else {
        await db('tg_attendance').insert({
          training_id: trainingId,
          user_id: userId,
          is_attended: 0,
          attendance_status: '1',
        });
      }

      return { success: true, training_id: trainingId, user_id: userId };
    } catch (error) {
      console.error('Enroll training error:', error);
      throw error;
    }
  },

  getEnrollmentStatus: async ({ training_id, user_id }) => {
    try {
      const trainingId = Number(training_id);
      const userId = Number(user_id);

      // Only consider enrolled if attendance_status = 1
      const row = await db('tg_attendance')
        .where({ training_id: trainingId, user_id: userId, attendance_status: 1 })
        .first('id');

      return {
        enrolled: Boolean(row?.id),
        status: row?.id ? 'enrolled' : null,
      };
    } catch (error) {
      console.error('Get enrollment status error:', error);
      throw error;
    }
  }
};

module.exports = Attendance;
