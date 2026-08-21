import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MainPage: React.FC = () => {
  const { session, profile, signOut } = useAuth();

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-end pb-16 relative"
      // 사용자가 업로드한 이미지를 public 폴더에 cover.png로 저장하여 배경으로 사용합니다.
      // 배경색은 이미지가 없을 때를 대비한 폴백(fallback)입니다.
      style={{ 
        backgroundImage: "url('/cover.png')",
        backgroundColor: '#87CEEB' // 하늘색 폴백
      }}
    >
      {/* 어두운 오버레이 (옵션: 배경 이미지가 너무 밝아 글씨가 안 보일 경우를 대비해 옅게 깔아줌) */}
      <div className="absolute inset-0 bg-black/10 z-0 pointer-events-none"></div>

      {/* 우측 상단 로그인 상태 및 버튼 */}
      <div className="absolute top-6 right-6 z-20 flex gap-4">
        {session ? (
          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full shadow-sm">
            <span className="font-bold text-gray-800">{profile?.name} 님 ({profile?.role === 'teacher' ? '선생님' : '학생'})</span>
            <button 
              onClick={signOut}
              className="text-sm font-bold text-red-500 hover:text-red-700 underline"
            >
              로그아웃
            </button>
            {profile?.role === 'teacher' ? (
              <Link to="/teacher" className="text-sm font-bold text-blue-600 hover:underline">선생님 페이지</Link>
            ) : (
              <Link to="/student" className="text-sm font-bold text-green-600 hover:underline">내 독서기록</Link>
            )}
          </div>
        ) : (
          <Link 
            to="/login"
            className="px-6 py-2 bg-sky-500 text-white font-bold rounded-full shadow-md hover:bg-sky-600 transition-all"
          >
            로그인
          </Link>
        )}
      </div>

      {/* 하단 버튼 영역 */}
      <div className="mb-12 flex flex-col items-center gap-8 z-10">
        {!session && (
          <Link 
            to="/teacher" 
            className="px-6 py-2 bg-white/70 backdrop-blur-md text-gray-800 rounded-full shadow-sm hover:bg-white transition-all font-semibold text-sm border border-gray-200"
          >
            선생님 대시보드 (관리자)
          </Link>
        )}
        <Link 
          to={session ? "/map" : "/login"}
          state={!session ? { from: { pathname: '/map' } } : undefined}
          className="px-12 py-4 bg-[#fff8e7] text-[#78350f] rounded-full shadow-[0_8px_0_#d4b08c] hover:shadow-[0_4px_0_#d4b08c] hover:translate-y-[4px] transition-all font-black text-2xl border-4 border-[#d4b08c]"
        >
          시작하기
        </Link>
      </div>
    </div>
  );
};

export default MainPage;
