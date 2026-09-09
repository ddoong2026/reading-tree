import { createClient, type User } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

export type AppRole = 'student' | 'teacher' | 'admin';

export async function requireUser(req: VercelRequest): Promise<{ user: User; role: AppRole } | null> {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await client.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await client.from('users').select('role').eq('id', user.id).single();
  if (!profile || !['student', 'teacher', 'admin'].includes(profile.role)) return null;
  return { user, role: profile.role as AppRole };
}

export function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server Supabase credentials are not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
