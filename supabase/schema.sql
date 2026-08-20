-- Phase 1: 독서오름나무 기본 데이터베이스 스키마 및 RLS 설정

-- 1. Classes 테이블 (반 정보)
CREATE TABLE public.classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL, -- 예: '1반', '2반'
  tree_level INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Users 테이블 (학생 및 선생님 정보)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id), -- 반 소속 정보
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Reading Logs 테이블 (독서록 기록)
CREATE TABLE public.reading_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  book_title TEXT NOT NULL,
  text_content TEXT, -- 음성 인식(STT) 또는 타이핑으로 입력된 내용
  image_url TEXT,    -- 첨부된 이미지 (그림) URL
  ai_feedback TEXT,  -- Gemini AI가 생성한 피드백
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Storage Bucket 설정 안내
-- 프로젝트 대시보드(Supabase)에서 'reading-log-images'라는 public 버킷을 생성해야 합니다.
-- INSERT 정책: 로그인한 사용자(학생)만 사진 업로드 가능
-- SELECT 정책: 모든 사용자가 열람 가능

-- 4. RLS (Row Level Security) 설정 예시
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;

-- 자신의 정보만 볼 수 있는 정책 (Users)
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING ( auth.uid() = id );

-- 자신이 작성한 독서록만 볼 수 있고, 선생님은 모두 볼 수 있는 정책 (Reading Logs)
-- (실제 구현 시 role 기반 검증 추가 필요)
CREATE POLICY "Users can view own logs"
  ON public.reading_logs FOR SELECT
  USING ( auth.uid() = user_id );
