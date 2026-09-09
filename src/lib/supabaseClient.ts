import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-anon-key';

// 기본 클라이언트 (로그인 세션 유지)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
