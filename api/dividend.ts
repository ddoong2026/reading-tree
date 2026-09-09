import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from './auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const webhookUrl = process.env.RULES_NATION_DIVIDEND_URL;
  const secret = process.env.READING_APP_WEBHOOK_SECRET;
  if (!webhookUrl || !secret) return res.status(500).json({ error: 'Dividend integration is not configured.' });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const actor = await requireUser(req);
  if (!token || !supabaseUrl || !anonKey || !actor) return res.status(401).json({ error: 'Authentication is required.' });
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const user = actor.user;
  const { data: profile } = await supabase.from('users').select('student_number, group_code, tree_exp').eq('id', user.id).single();
  if (!profile?.student_number || !profile.group_code || !profile.tree_exp) return res.status(422).json({ error: 'Student number, group code, or experience is missing.' });
  const { tree_exp } = req.body || {};
  if (!Number.isInteger(tree_exp) || tree_exp !== profile.tree_exp) return res.status(409).json({ error: 'Experience is not synchronized yet.' });
  const student_number = profile.student_number;
  const group_code = profile.group_code;
  const xp_delta = 1;
  const event_id = `tree-exp-${user.id}-${tree_exp}`;
  const upstream = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` }, body: JSON.stringify({ student_number, group_code, xp_delta, event_id }) });
  return res.status(upstream.status).json(await upstream.json().catch(() => ({})));
}
