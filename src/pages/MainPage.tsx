import React from 'react';
import { Link } from 'react-router-dom';

const MainPage: React.FC = () => {
  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-between py-12 relative"
      // 사용자가 업로드한 이미지를 public 폴더에 cover.png로 저장하여 배경으로 사용합니다.
      // 배경색은 이미지가 없을 때를 대비한 폴백(fallback)입니다.
      style={{ 
        backgroundImage: "url('/cover.png')",
        backgroundColor: '#87CEEB' // 하늘색 폴백
      }}
    >
      {/* 어두운 오버레이 (옵션: 배경 이미지가 너무 밝아 글씨가 안 보일 경우를 대비해 옅게 깔아줌) */}
      <div className="absolute inset-0 bg-black/10 z-0 pointer-events-none"></div>

      {/* 타이틀 영역 */}
      <div className="mt-4 md:mt-12 flex flex-col items-center z-10">
        <h1 
          className="text-5xl md:text-7xl font-black text-amber-50 drop-shadow-[0_6px_6px_rgba(0,0,0,0.4)] tracking-wide mb-2"
          style={{ WebkitTextStroke: '2px #78350f' }} // 갈색 테두리
        >
          독서오름나무
        </h1>
        <p 
          className="text-xl md:text-2xl font-bold text-amber-50 drop-shadow-md"
          style={{ WebkitTextStroke: '1px #78350f' }}
        >
          Reading Climbing Tree
        </p>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="mb-12 flex flex-col items-center gap-6 z-10">
        <Link 
          to="/map" 
          className="px-12 py-4 bg-[#fff8e7] text-[#78350f] rounded-full shadow-[0_8px_0_#d4b08c] hover:shadow-[0_4px_0_#d4b08c] hover:translate-y-[4px] transition-all font-black text-2xl border-4 border-[#d4b08c]"
        >
          시작하기
        </Link>
        <Link 
          to="/teacher" 
          className="px-6 py-2 bg-white/70 backdrop-blur-md text-gray-800 rounded-full shadow-sm hover:bg-white transition-all font-semibold text-sm border border-gray-200"
        >
          선생님 대시보드 (관리자)
        </Link>
      </div>
    </div>
  );
};

export default MainPage;
