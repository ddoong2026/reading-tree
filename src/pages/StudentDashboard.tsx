import React from 'react';
import { Link } from 'react-router-dom';

const StudentDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-900">내 독서 기록</h1>
        <Link to="/" className="text-blue-600 hover:underline">홈으로 돌아가기</Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm md:col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">최근 작성한 독서록</h2>
          <div className="text-gray-500 italic py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            아직 작성한 독서록이 없어요. 첫 독서록을 남겨볼까요?
          </div>
          <div className="mt-6 flex justify-end">
            <Link to="/write" className="px-6 py-3 bg-green-500 text-white rounded-full shadow-md hover:bg-green-600 transition-colors font-bold">
              + 새 독서록 쓰기
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col items-center">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 w-full text-left">내 펫 키우기</h2>
            {/* Dummy Pet */}
            <div className="w-32 h-32 bg-yellow-100 rounded-full border-4 border-yellow-300 flex items-center justify-center text-4xl mb-4">
              🥚
            </div>
            <p className="text-center text-sm text-gray-600">독서록을 꾸준히 쓰면<br/>알에서 예쁜 동물이 태어날 거예요!</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">나무 성장 기여도</h2>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-green-600">0</span>
              <span className="text-gray-500 mb-1">건</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '5%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">다음 단계까지 5건 남음</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
