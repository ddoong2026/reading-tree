import React from 'react';
import { Link } from 'react-router-dom';

const TeacherDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-purple-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-purple-900">선생님 대시보드</h1>
        <Link to="/" className="text-purple-600 hover:underline">홈으로 돌아가기</Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
          <h3 className="text-gray-500 font-medium mb-2">전체 학생 수</h3>
          <p className="text-4xl font-bold text-gray-800">150<span className="text-xl text-gray-500 font-normal">명</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
          <h3 className="text-gray-500 font-medium mb-2">오늘 작성된 독서록</h3>
          <p className="text-4xl font-bold text-purple-600">32<span className="text-xl text-gray-500 font-normal">건</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
          <h3 className="text-gray-500 font-medium mb-2">현재 나무 성장 단계</h3>
          <p className="text-4xl font-bold text-green-600">Lv. 3</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">최근 독서록 목록 (학생별)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-3 px-4 text-gray-500 font-semibold">학생 이름</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">작성 일시</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">형태</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">AI 피드백 요약</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">상세 보기</th>
              </tr>
            </thead>
            <tbody>
              {/* Dummy Data Row */}
              <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">김철수</td>
                <td className="py-3 px-4 text-gray-500">방금 전</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                    텍스트
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-[200px]">
                  참 잘했어요! 토끼의 마음을 잘 이해했군요.
                </td>
                <td className="py-3 px-4">
                  <button className="text-purple-600 hover:text-purple-800 font-medium text-sm underline">보기</button>
                </td>
              </tr>
              {/* Dummy Data Row 2 */}
              <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">이영희</td>
                <td className="py-3 px-4 text-gray-500">10분 전</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-medium">
                    그림 포함
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-[200px]">
                  그림이 정말 멋져요! 책의 내용이 잘 담겨있네요.
                </td>
                <td className="py-3 px-4">
                  <button className="text-purple-600 hover:text-purple-800 font-medium text-sm underline">보기</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
