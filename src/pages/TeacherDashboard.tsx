import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';

interface Student {
  id: string;
  name: string;
  created_at: string;
}

interface ReadingLog {
  id: string;
  user_id: string;
  book_title: string;
  created_at: string;
  ai_feedback: string;
  image_url: string | null;
  users?: { name: string };
}

const TeacherDashboard: React.FC = () => {
  const [grade, setGrade] = useState('1');
  const [classNum, setClassNum] = useState('1');
  const [endNumber, setEndNumber] = useState('30');
  const [missingNumbers, setMissingNumbers] = useState('');
  
  const [batchPassword, setBatchPassword] = useState('123456');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchLogs, setBatchLogs] = useState<string[]>([]);

  // 실 데이터 상태
  const [students, setStudents] = useState<Student[]>([]);
  const [allLogs, setAllLogs] = useState<ReadingLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // 데이터 불러오기
  const fetchData = async () => {
    setLoadingData(true);
    
    // 1. 학생 목록 가져오기
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, created_at')
      .eq('role', 'student')
      .order('name', { ascending: true });

    if (userError) console.error("Error fetching students:", userError);
    else setStudents(userData || []);

    // 2. 모든 독서록 가져오기 (이름 포함)
    const { data: logData, error: logError } = await supabase
      .from('reading_logs')
      .select('id, user_id, book_title, created_at, ai_feedback, image_url, users(name)')
      .order('created_at', { ascending: false });

    if (logError) console.error("Error fetching logs:", logError);
    else setAllLogs((logData as any) || []);

    setLoadingData(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBatchCreate = async () => {
    const end = parseInt(endNumber);
    if (!end || end < 1) {
      alert("끝 번호를 올바르게 입력해주세요.");
      return;
    }
    if (batchPassword.length < 6) {
      alert("비밀번호는 최소 6자리 이상이어야 합니다.");
      return;
    }

    setBatchLoading(true);
    setBatchLogs([]);

    const missing = missingNumbers.split(/[,\s]+/).map(n => parseInt(n)).filter(n => !isNaN(n));
    const newLogs: string[] = [];

    const g = grade.trim();
    const c = classNum.trim();
    
    for (let i = 1; i <= end; i++) {
      if (missing.includes(i)) continue;

      const numStr = i < 10 ? `0${i}` : `${i}`;
      const id = `${g}${c}${numStr}`;
      
      const email = /^\d+$/.test(id) ? `s_${id}@dokseo.app` : `${id}@dokseo.app`; 
      const name = id; 

      newLogs.push(`⏳ 진행 중: [${id}] 계정 생성 중...`);
      setBatchLogs([...newLogs]);

      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
          email,
          password: batchPassword,
        });

        if (authError || !authData.user) {
          throw new Error(authError?.message || "Auth 계정 생성 실패");
        }

        const { error: dbError } = await supabase.from('users').insert({
          id: authData.user.id,
          role: 'student',
          name: name,
        });

        if (dbError) {
          throw new Error(dbError.message);
        }

        newLogs[newLogs.length - 1] = `✅ 성공: [${id}] 계정이 생성되었습니다.`;
      } catch (error: any) {
        let errorMsg = error.message;
        if (errorMsg.includes('User already registered')) {
          errorMsg = '이미 존재하는 아이디입니다.';
        }
        newLogs[newLogs.length - 1] = `❌ 실패: [${id}] - ${errorMsg}`;
      }

      setBatchLogs([...newLogs]);
    }

    setBatchLoading(false);
    // 일괄 생성 후 목록 갱신
    fetchData();
  };

  const handlePasswordReset = (studentId: string) => {
    alert(
      `보안 정책상 웹에서 다른 사용자의 비밀번호를 강제로 변경할 수 없습니다.\n\n[초기화 방법]\n1. Supabase 관리자 대시보드 접속\n2. Authentication -> Users 메뉴 이동\n3. [${studentId}] 검색 후 우측 점 3개(메뉴) 클릭\n4. 'Reset Password' 또는 'Set Password' 클릭`
    );
  };

  // 통계 계산
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayLogsCount = allLogs.filter(log => new Date(log.created_at) >= todayStart).length;

  return (
    <div className="min-h-screen bg-purple-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-purple-900">선생님 대시보드</h1>
        <div className="flex gap-4 items-center">
          <button onClick={fetchData} className="px-4 py-2 bg-purple-200 text-purple-800 rounded-lg hover:bg-purple-300 font-bold text-sm">
            🔄 새로고침
          </button>
          <Link to="/" className="text-purple-600 hover:underline font-bold">홈으로 돌아가기</Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center border-t-4 border-indigo-400">
          <h3 className="text-gray-500 font-medium mb-2">등록된 학생 수</h3>
          <p className="text-4xl font-bold text-gray-800">
            {loadingData ? '-' : students.length}
            <span className="text-xl text-gray-500 font-normal">명</span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center border-t-4 border-purple-400">
          <h3 className="text-gray-500 font-medium mb-2">오늘 작성된 독서록</h3>
          <p className="text-4xl font-bold text-purple-600">
            {loadingData ? '-' : todayLogsCount}
            <span className="text-xl text-gray-500 font-normal">건</span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center border-t-4 border-green-400">
          <h3 className="text-gray-500 font-medium mb-2">누적 독서록 (총합)</h3>
          <p className="text-4xl font-bold text-green-600">
            {loadingData ? '-' : allLogs.length}
            <span className="text-xl text-gray-500 font-normal">건</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* 학생 계정 일괄 생성 섹션 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col h-full">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">학생 번호 자동 일괄 생성</h2>
          <p className="text-gray-500 mb-6 text-sm flex-1">
            학년, 반, 끝 번호를 입력하면 번호 규칙에 맞춰 아이디가 생성됩니다.<br/>
            (예: 1학년 1반 1번 = 1101)
          </p>

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">학년</label>
                <input 
                  type="number" 
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  disabled={batchLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">반</label>
                <input 
                  type="number" 
                  value={classNum}
                  onChange={(e) => setClassNum(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  disabled={batchLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">끝 번호 (총 인원)</label>
                <input 
                  type="number" 
                  value={endNumber}
                  onChange={(e) => setEndNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  disabled={batchLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">결번 (예: 4, 13)</label>
                <input 
                  type="text" 
                  placeholder="없으면 비워두세요"
                  value={missingNumbers}
                  onChange={(e) => setMissingNumbers(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  disabled={batchLoading}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 mt-2 flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">초기 비밀번호</label>
                <input 
                  type="text" 
                  value={batchPassword}
                  onChange={(e) => setBatchPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  disabled={batchLoading}
                />
              </div>
              <button 
                onClick={handleBatchCreate}
                disabled={batchLoading}
                className={`px-6 py-2 h-[42px] rounded-lg font-bold text-white transition-all whitespace-nowrap ${
                  batchLoading
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'
                }`}
              >
                {batchLoading ? '생성 중...' : '자동 생성 시작'}
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 overflow-y-auto h-28 font-mono text-xs">
              {batchLogs.length === 0 ? (
                <p className="text-gray-400 italic text-center mt-8">로그가 여기에 표시됩니다.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {batchLogs.map((log, index) => (
                    <li key={index} className={log.includes('❌') ? 'text-red-500' : log.includes('✅') ? 'text-green-600' : 'text-blue-500'}>
                      {log}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* 학생 목록 및 관리 섹션 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col h-full">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">학생 관리</h2>
          <div className="overflow-y-auto flex-1 max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100 sticky top-0 bg-white z-10">
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">아이디 (학번)</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">가입일</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">작성한 독서록</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-500">데이터 불러오는 중...</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-500 italic">아직 등록된 학생이 없습니다.</td></tr>
                ) : (
                  students.map(student => {
                    const studentLogsCount = allLogs.filter(log => log.user_id === student.id).length;
                    return (
                      <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-800">{student.name}</td>
                        <td className="py-3 px-4 text-gray-500 text-sm">{new Date(student.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">
                            {studentLogsCount}건
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            onClick={() => handlePasswordReset(student.name)}
                            className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-bold transition-colors"
                          >
                            비밀번호 초기화
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">전체 독서록 최신 목록</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-3 px-4 text-gray-500 font-semibold">학생 (학번)</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">작성 일시</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">책 제목</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">형태</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">AI 피드백 요약</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">데이터 불러오는 중...</td></tr>
              ) : allLogs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500 italic">아직 작성된 독서록이 없습니다.</td></tr>
              ) : (
                allLogs.slice(0, 10).map(log => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-800">{log.users?.name || '알 수 없음'}</td>
                    <td className="py-3 px-4 text-gray-500 text-sm">
                      {new Date(log.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-700">{log.book_title}</td>
                    <td className="py-3 px-4">
                      {log.image_url ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-medium">
                          그림 포함
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                          텍스트
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-[300px]" title={log.ai_feedback}>
                      {log.ai_feedback || '피드백 없음'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {allLogs.length > 10 && (
            <div className="text-center mt-4 text-sm text-gray-400">최근 10개까지만 표시됩니다.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
