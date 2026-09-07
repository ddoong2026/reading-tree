import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../lib/supabaseClient';
import { Trash2 } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  created_at: string;
  class_id?: string | null;
}

interface ReadingLog {
  id: string;
  user_id: string;
  book_title: string;
  created_at: string;
  text_content: string | null;
  ai_feedback: string;
  image_url: string | null;
  users?: { name: string };
}

interface Feedback {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: { name: string };
}

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [schoolYear, setSchoolYear] = useState(new Date().getFullYear().toString());
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
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  
  // 프롬프트 상태
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // 모달 상태
  const [viewLog, setViewLog] = useState<ReadingLog | null>(null);

  // 동적 반 목록 추출
  const distinctClasses = Array.from(new Set(students.map(s => s.class_id).filter(Boolean))) as string[];

  // 반 ID 포맷팅 함수 (예: "2026-1-1" -> "2026학년도 1학년 1반")
  const formatClassId = (cid: string) => {
    const parts = cid.split('-');
    if (parts.length === 3) {
      return `${parts[0]}학년도 ${parts[1]}학년 ${parts[2]}반`;
    }
    if (cid === 'class-1') return '새싹 1반';
    if (cid === 'class-2') return '햇살 2반';
    if (cid === 'class-3') return '푸른 3반';
    return cid;
  };

  // 데이터 불러오기
  const fetchData = async () => {
    setLoadingData(true);
    
    // 1. 학생 목록 가져오기
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, created_at, class_id')
      .eq('role', 'student')
      .order('name', { ascending: true });

    if (userError) console.error("Error fetching students:", userError);
    else setStudents(userData || []);

    // 2. 모든 독서록 가져오기 (이름 포함)
    const { data: logData, error: logError } = await supabase
      .from('reading_logs')
      .select('id, user_id, book_title, created_at, text_content, ai_feedback, image_url, users(name)')
      .order('created_at', { ascending: false });

    if (logError) console.error("Error fetching logs:", logError);
    else setAllLogs((logData as any) || []);

    // 3. 학생 건의사항 가져오기
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('student_feedbacks')
      .select('id, user_id, content, created_at, users(name)')
      .order('created_at', { ascending: false });

    if (feedbackError) console.error("Error fetching feedbacks:", feedbackError);
    else setFeedbacks((feedbackData as any) || []);

    // 4. AI 프롬프트 가져오기
    const { data: promptData, error: promptError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('id', 'ai_prompt')
      .maybeSingle();

    if (!promptError && promptData) {
      setAiPrompt(promptData.value);
    }

    setLoadingData(false);
  };

  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    const { error } = await supabase
      .from('app_settings')
      .update({ value: aiPrompt })
      .eq('id', 'ai_prompt');
    
    if (error) {
      alert('프롬프트 저장 중 오류가 발생했습니다.\n(SQL을 실행하여 테이블을 생성했는지 확인해주세요.)\n' + error.message);
    } else {
      alert('AI 피드백 프롬프트가 성공적으로 저장되었습니다!');
    }
    setIsSavingPrompt(false);
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

        let userId = authData?.user?.id;

        // 이미 Auth에 가입되어 있으나 public.users에서만 삭제된 경우 복구 시도
        if (authError && authError.message.includes('User already registered')) {
          const { data: loginData } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password: batchPassword,
          });
          
          if (loginData?.user) {
            userId = loginData.user.id;
          } else {
            throw new Error('이미 존재하는 아이디입니다. (완전히 삭제하려면 Supabase 대시보드의 Authentication -> Users에서 삭제해야 합니다)');
          }
        } else if (authError || !userId) {
          throw new Error(authError?.message || "Auth 계정 생성 실패");
        }

        // upsert를 사용하여 이미 있더라도 덮어쓰거나 복구함
        const { error: dbError } = await supabase.from('users').upsert({
          id: userId,
          role: 'student',
          name: name,
          class_id: `${schoolYear}-${g}-${c}` // 학년도-학년-반 형식으로 기본 반 저장
        });

        if (dbError) {
          throw new Error(dbError.message);
        }

        newLogs[newLogs.length - 1] = `✅ 성공: [${id}] 계정이 생성(또는 복구)되었습니다.`;
      } catch (error: any) {
        newLogs[newLogs.length - 1] = `❌ 실패: [${id}] - ${error.message}`;
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

  const handleDeleteLog = async (id: string, title: string, studentName: string) => {
    if (!window.confirm(`[${studentName}] 학생의 '${title}' 독서록을 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`)) return;

    const { data, error } = await supabase
      .from('reading_logs')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error deleting log:', error);
      alert('삭제 실패: ' + error.message);
    } else if (data && data.length === 0) {
      alert('삭제 권한이 없거나 이미 삭제되었습니다.\n(Supabase에서 RLS DELETE 정책 설정을 확인해주세요)');
    } else {
      setAllLogs(allLogs.filter(log => log.id !== id));
      alert('독서록이 삭제되었습니다.');
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("이 건의사항을 삭제하시겠습니까?")) return;
    
    const { error } = await supabase
      .from('student_feedbacks')
      .delete()
      .eq('id', id);
      
    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      setFeedbacks(feedbacks.filter(f => f.id !== id));
    }
  };

  const handleUpdateStudentClass = async (studentId: string, newClassId: string) => {
    // RLS 정책 때문에 선생님 계정으로 학생의 users 테이블을 업데이트하려면 supabaseAdmin(서비스 롤)을 사용해야 합니다.
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ class_id: newClassId })
      .eq('id', studentId)
      .select();

    if (error) {
      alert('반 설정 변경 중 오류가 발생했습니다: ' + error.message);
    } else if (data && data.length === 0) {
      alert('업데이트 권한이 없습니다.');
    } else {
      // update local state
      setStudents(students.map(s => s.id === studentId ? { ...s, class_id: newClassId } : s));
      alert('반이 정상적으로 변경되었습니다.');
    }
  };

  const handleBulkDeleteLogs = async () => {
    if (selectedLogIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedLogIds.length}개의 독서록을 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`)) return;

    const { data, error } = await supabase
      .from('reading_logs')
      .delete()
      .in('id', selectedLogIds)
      .select();

    if (error) {
      console.error('Error deleting logs:', error);
      alert('일부 또는 전체 삭제 실패: ' + error.message);
    } else if (data && data.length === 0) {
      alert('삭제 권한이 없거나 이미 삭제되었습니다.\n(Supabase에서 RLS DELETE 정책 설정을 확인해주세요)');
    } else {
      setAllLogs(allLogs.filter(log => !selectedLogIds.includes(log.id)));
      setSelectedLogIds([]);
      alert(`${data?.length || selectedLogIds.length}개의 독서록이 삭제되었습니다.`);
    }
  };

  const handleViewStudentDashboard = (student: Student) => {
    navigate(`/student/${student.id}`);
  };

  // 통계 계산
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayLogsCount = allLogs.filter(log => new Date(log.created_at) >= todayStart).length;

  // API 모델 진단 함수
  const checkApiModels = async () => {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY || API_KEY === 'your_api_key_here') {
      alert('Vercel에 VITE_GEMINI_API_KEY가 설정되어 있지 않습니다.');
      return;
    }
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
      if (!response.ok) {
        const err = await response.text();
        alert(`API 키 권한 에러 (${response.status}):\n${err}`);
        return;
      }
      const data = await response.json();
      const modelNames = data.models.map((m: any) => m.name).join('\n');
      alert(`사용 가능한 모델 목록:\n${modelNames}`);
    } catch (error: any) {
      alert(`통신 에러:\n${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-purple-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-purple-900">선생님/관리자 대시보드</h1>
        <div className="flex gap-4 items-center">
          <button 
            onClick={checkApiModels}
            className="px-4 py-2 bg-yellow-100 text-yellow-700 font-bold rounded-lg shadow-sm hover:bg-yellow-200 transition-colors text-sm"
          >
            API 진단
          </button>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">학년도</label>
                <input 
                  type="text" 
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  disabled={batchLoading}
                />
              </div>
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
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">소속 반</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500">데이터 불러오는 중...</td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500 italic">아직 등록된 학생이 없습니다.</td></tr>
                ) : (
                  students.map(student => {
                    const studentLogsCount = allLogs.filter(log => log.user_id === student.id).length;
                    return (
                      <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td 
                          className="py-3 px-4 font-medium text-purple-600 cursor-pointer hover:underline"
                          onClick={() => handleViewStudentDashboard(student)}
                          title="학생 대시보드 열람"
                        >
                          {student.name}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-sm">{new Date(student.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold">
                            {studentLogsCount}건
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select 
                            value={student.class_id || ''} 
                            onChange={(e) => handleUpdateStudentClass(student.id, e.target.value)}
                            className="p-1 border border-gray-200 rounded text-sm text-gray-700 focus:outline-none focus:border-purple-400"
                          >
                            <option value="">미지정</option>
                            {distinctClasses.map(cid => (
                              <option key={cid} value={cid}>{formatClassId(cid)}</option>
                            ))}
                          </select>
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">전체 독서록 최신 목록</h2>
          {selectedLogIds.length > 0 && (
            <button
              onClick={handleBulkDeleteLogs}
              className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-sm hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
            >
              <Trash2 size={16} />
              선택 삭제 ({selectedLogIds.length})
            </button>
          )}
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100 sticky top-0 bg-white z-10 shadow-sm">
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                    checked={allLogs.length > 0 && selectedLogIds.length === allLogs.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLogIds(allLogs.map(log => log.id));
                      } else {
                        setSelectedLogIds([]);
                      }
                    }}
                  />
                </th>
                <th className="py-3 px-4 text-gray-500 font-semibold">학생 (학번)</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">작성 일시</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">책 제목</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">형태</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">AI 피드백 요약</th>
                <th className="py-3 px-4 text-gray-500 font-semibold text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">데이터 불러오는 중...</td></tr>
              ) : allLogs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500 italic">아직 작성된 독서록이 없습니다.</td></tr>
              ) : (
                allLogs.map(log => (
                  <tr key={log.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedLogIds.includes(log.id) ? 'bg-purple-50/50' : ''}`}>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                        checked={selectedLogIds.includes(log.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLogIds([...selectedLogIds, log.id]);
                          } else {
                            setSelectedLogIds(selectedLogIds.filter(id => id !== log.id));
                          }
                        }}
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-800">{log.users?.name || '알 수 없음'}</td>
                    <td className="py-3 px-4 text-gray-500 text-sm">
                      {new Date(log.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td 
                      className="py-3 px-4 font-medium text-purple-600 cursor-pointer hover:underline"
                      onClick={() => setViewLog(log)}
                    >
                      {log.book_title}
                    </td>
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
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteLog(log.id, log.book_title, log.users?.name || '알 수 없음')}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors inline-flex justify-center"
                        title="삭제하기"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI 피드백 프롬프트 설정 섹션 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">AI 피드백 설정 (프롬프트 관리)</h2>
        <p className="text-gray-500 mb-4 text-sm">
          나무요정 선생님이 아이들에게 피드백을 줄 때 사용할 프롬프트(명령어)입니다.<br/>
          반드시 <strong>[학생글]</strong> 이라는 키워드를 포함해주세요. 실제 학생의 독서록 내용으로 자동 변환됩니다.
        </p>
        
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="여기에 AI에게 내릴 지시사항을 적어주세요. (예: 너는 다정한 선생님이야...)"
          className="w-full p-4 min-h-[250px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y mb-4 font-mono text-sm"
        />
        
        <div className="flex justify-end">
          <button 
            onClick={handleSavePrompt}
            disabled={isSavingPrompt}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
          >
            {isSavingPrompt ? '저장 중...' : '프롬프트 저장하기'}
          </button>
        </div>
      </div>

      {/* 학생 건의사항 확인 섹션 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          💌 학생 건의사항 확인
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedbacks.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-8 text-gray-500 italic bg-gray-50 rounded-xl">
              아직 등록된 건의사항이 없습니다.
            </div>
          ) : (
            feedbacks.map(f => (
              <div key={f.id} className="bg-gray-50 p-5 rounded-xl border border-gray-100 relative group">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800">{f.users?.name || '알 수 없음'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(f.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap text-sm">{f.content}</p>
                <button
                  onClick={() => handleDeleteFeedback(f.id)}
                  className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 bg-white rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  title="건의사항 삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 독서록 상세 보기 모달 */}
      {viewLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{viewLog.book_title}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  작성자: <span className="font-semibold text-purple-600">{viewLog.users?.name || '알 수 없음'}</span> | 
                  일시: {new Date(viewLog.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <button 
                onClick={() => setViewLog(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {viewLog.image_url && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-2">첨부 이미지</h3>
                <img src={viewLog.image_url} alt="학생 첨부 이미지" className="max-h-64 rounded-xl border border-gray-200 shadow-sm" />
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-2">학생이 작성한 내용</h3>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 min-h-[100px] whitespace-pre-wrap text-gray-800">
                {viewLog.text_content || <span className="text-gray-400 italic">내용이 없습니다.</span>}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-bold text-purple-800 mb-2">AI 멘토의 피드백 ✨</h3>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 min-h-[80px] whitespace-pre-wrap text-purple-700">
                {viewLog.ai_feedback || <span className="text-gray-400 italic">피드백이 없습니다.</span>}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setViewLog(null)}
                className="px-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  handleDeleteLog(viewLog.id, viewLog.book_title, viewLog.users?.name || '알 수 없음');
                  setViewLog(null);
                }}
                className="px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
