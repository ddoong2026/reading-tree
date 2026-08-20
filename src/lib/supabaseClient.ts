import { createClient } from '@supabase/supabase-js';

// TODO: 환경 변수에 Supabase 프로젝트 URL과 API Key를 입력해야 실제 동작합니다.
// Phase 1 단계에서는 모의 동작을 위해 더미 값을 넣거나 에러를 방지합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
