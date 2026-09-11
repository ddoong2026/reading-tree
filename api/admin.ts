import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceClient, requireUser } from './auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const actor = await requireUser(req);
  if (!actor || !['teacher', 'admin'].includes(actor.role)) return res.status(403).json({ error: 'Teacher access is required.' });
  const { action } = req.body || {};
  const admin = getServiceClient();
  try {
    if (action === 'createStudent') {
      const { email, password, name, studentNumber, classId } = req.body;
      if (!/^s_\d+@dokseo\.app$/.test(email) || typeof password !== 'string' || password.length < 8 || !Number.isInteger(studentNumber)) return res.status(400).json({ error: 'Invalid student account data.' });
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error;
      const { error: profileError } = await admin.from('users').insert({ id: data.user.id, role: 'student', name, student_number: studentNumber, class_id: classId });
      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        throw profileError;
      }
      return res.status(201).json({ id: data.user.id });
    }
    if (action === 'createTeacher') {
      if (actor.role !== 'admin') return res.status(403).json({ error: 'Administrator access is required.' });
      const { email, password, name, classId } = req.body;
      if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8 || typeof name !== 'string' || !name.trim() || !/^\d{4,}-\d+-[12]$/.test(classId)) {
        return res.status(400).json({ error: 'Invalid teacher account data.' });
      }
      const { data, error } = await admin.auth.admin.createUser({ email: email.trim(), password, email_confirm: true });
      if (error) throw error;
      const { error: profileError } = await admin.from('users').insert({ id: data.user.id, role: 'teacher', name: name.trim(), class_id: classId });
      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        throw profileError;
      }
      return res.status(201).json({ id: data.user.id });
    }
    if (action === 'updateStudent') {
      const { studentId, classId, groupCode, seedLevel, treeExp } = req.body;
      if (typeof studentId !== 'string') return res.status(400).json({ error: 'Invalid student id.' });
      const update: Record<string, unknown> = {};
      if (typeof classId === 'string' || classId === null) update.class_id = classId;
      if (typeof groupCode === 'string' || groupCode === null) update.group_code = groupCode;
      if (Number.isInteger(seedLevel) && seedLevel >= 1) update.seed_level = seedLevel;
      if (Number.isInteger(treeExp) && treeExp >= 0) update.tree_exp = treeExp;
      if (!Object.keys(update).length) return res.status(400).json({ error: 'No permitted fields supplied.' });
      const { error } = await admin.from('users').update(update).eq('id', studentId).eq('role', 'student');
      if (error) throw error;
      return res.status(204).end();
    }
    if (action === 'resetPlant') {
      const { studentId } = req.body;
      if (typeof studentId !== 'string') return res.status(400).json({ error: 'Invalid user id.' });
      const { data: target, error: targetError } = await admin.from('users').select('id, role').eq('id', studentId).maybeSingle();
      if (targetError) throw targetError;
      if (!target) return res.status(404).json({ error: 'User not found.' });
      // Teachers may reset students and their own plant; only admins may reset another staff member.
      if (target.role !== 'student' && target.id !== actor.user.id && actor.role !== 'admin') return res.status(403).json({ error: 'You cannot reset this user.' });
      // Archived flowers are part of the same plant reset. Ignore a missing
      // archive table during the one-time migration rollout.
      await admin.from('user_plants').delete().eq('user_id', studentId);
      const { data, error } = await admin.from('users').update({ plant_growth: 0, seed_level: 1, tree_exp: 0, used_water: 0, used_sun: 0, used_wind: 0, plant_position_x: null, plant_position_z: null }).eq('id', studentId).select('id').maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'User not found.' });
      return res.status(204).end();
    }
    return res.status(400).json({ error: 'Unknown action.' });
  } catch (error: any) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: 'Administrative operation failed.' });
  }
}
