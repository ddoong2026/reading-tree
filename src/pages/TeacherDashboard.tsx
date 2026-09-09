import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Trash2 } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  created_at: string;
  class_id?: string | null;
  plant_growth?: number;
  seed_level?: number;
  tree_exp?: number;
  used_water?: number;
  used_sun?: number;
  used_wind?: number;
  student_number?: number | null;
  group_code?: string | null;
  role?: string;
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
  edit_count?: number;
  edit_days?: number;
  daily_attempts?: number;
  last_edit_date?: string;
  revision_history?: any[];
  score_improvement?: number;
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
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  // 프롬프트 상태
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // 모달 상태
  const [viewLog, setViewLog] = useState<ReadingLog | null>(null);

  const callAdmin = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || '관리 작업에 실패했습니다.');
    }
  };

  // 필터 상태
  const [filterType, setFilterType] = useState<string>('all');

  // 동적 반 목록 추출
  const distinctClasses = Array.from(new Set(students.map(s => s.class_id).filter(Boolean))) as string[];
  const availableGrades = Array.from(new Set(students.map(s => {
    if (!s.class_id) return null;
    const parts = s.class_id.split('-');
    return parts.length === 3 ? parts[1] : null;
  }).filter(Boolean))) as string[];

  // 학생 목록 필터링
  const filteredStudents = students.filter(student => {
    if (filterType === 'all') return true;
    if (filterType === 'unassigned') return !student.class_id;
    if (filterType.startsWith('grade-')) {
      const targetGrade = filterType.replace('grade-', '');
      if (!student.class_id) return false;
      const parts = student.class_id.split('-');
      return parts.length === 3 && parts[1] === targetGrade;
    }
    if (filterType.startsWith('class-')) {
      const targetClass = filterType.replace('class-', '');
      return student.class_id === targetClass;
    }
    return true;
  });

  // 반 ID 포맷팅 함수 (예: "2026-1-1" -> "2026학년도 1학년 1반")
  const formatClassId = (cid: string) => {
    const parts = cid.split('-');
    if (parts.length === 3) {
      return `${parts[0]}학년도 ${parts[1]}학년 ${parts[2]}반`;
    }
    if (cid === 'class-1') return '5학년 1반';
    if (cid === 'class-2') return '5학년 2반';
    if (cid === 'class-3') return '관리자의 숲';
    return cid;
  };

  // 데이터 불러오기
  const fetchData = async () => {
    setLoadingData(true);
    
    // 1. 사용자 목록 가져오기 (학생, 교사, 관리자 포함)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, student_number, group_code, created_at, class_id, plant_growth, seed_level, tree_exp, used_water, used_sun, used_wind, role')
      .order('name', { ascending: true });

    if (userError) console.error("Error fetching students:", userError);
    else setStudents(userData || []);

    // 2. 모든 독서록 가져오기 (이름 포함)
    const { data: logData, error: logError } = await supabase
      .from('reading_logs')
      .select('id, user_id, book_title, created_at, text_content, ai_feedback, image_url, users(name), edit_count, edit_days, daily_attempts, last_edit_date, revision_history, score_improvement')
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

  const handleBetaResetAll = async () => {
    if (!window.confirm("정말로 모든 학생의 독서 기록, 건의사항, 식물 상태 등을 초기화하시겠습니까?\n이 작업은 베타 테스트용이며 복구할 수 없습니다.")) return;
    if (window.prompt("초기화를 진행하려면 '초기화'라고 입력해주세요.") !== '초기화') {
      alert('초기화가 취소되었습니다.');
      return;
    }

    setLoadingData(true);
    await supabase.from('reading_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('student_feedbacks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').update({
      points: 0,
      item_water: 0,
      item_sun: 0,
      item_wind: 0,
      used_water: 0,
      used_sun: 0,
      used_wind: 0,
      plant_growth: 0,
      plant_position_x: null,
      plant_position_z: null,
      seed_level: 1,
      seed_bought_at: null,
      tree_exp: 0
    }).neq('id', '00000000-0000-0000-0000-000000000000');

    alert("초기화가 완료되었습니다.");
    fetchData();
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
        await callAdmin({ action: 'createStudent', email, password: batchPassword, name, studentNumber: parseInt(id, 10), classId: `${schoolYear}-${g}-${c}` });

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

  const handleBulkDeleteStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedStudentIds.length}명의 학생 계정을 삭제하시겠습니까?\n이 작업은 복구할 수 없으며 연관 데이터가 모두 삭제됩니다.`)) return;

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedStudentIds) {
      const { error } = await supabase.rpc('delete_user_account', { target_user_id: id });
      if (error) failCount++;
      else successCount++;
    }

    if (failCount > 0) {
      alert(`${successCount}명 삭제 완료, ${failCount}명 삭제 실패.\n(Supabase SQL 쿼리 설정이나 권한을 확인해주세요.)`);
    } else {
      alert(`${successCount}명의 학생 계정이 모두 삭제되었습니다.`);
    }

    setStudents(students.filter(s => !selectedStudentIds.includes(s.id)));
    setSelectedStudentIds([]);
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`정말 [${name}] 학생의 계정을 삭제하시겠습니까?\n이 작업은 복구할 수 없으며 독서록 등 연관 데이터가 모두 삭제됩니다.`)) return;

    // Supabase RPC 함수를 호출하여 auth.users까지 완전히 삭제 (Security Definer 활용)
    const { error } = await supabase.rpc('delete_user_account', { target_user_id: id });

    if (error) {
      alert('학생 삭제 중 오류가 발생했습니다: ' + error.message + '\n(Supabase에 SQL 쿼리가 실행되었는지 확인해주세요.)');
    } else {
      setStudents(students.filter(s => s.id !== id));
      alert(`[${name}] 학생 계정이 완전히 삭제되었습니다.`);
    }
  };

  const handleUpdateStudentClass = async (studentId: string, newClassId: string) => {
    // 권한 있는 서버 API가 서비스 역할로 변경한다.
    try {
      await callAdmin({ action: 'updateStudent', studentId, classId: newClassId });
      // update local state
      setStudents(students.map(s => s.id === studentId ? { ...s, class_id: newClassId } : s));
      alert('반이 정상적으로 변경되었습니다.');
    } catch (error: any) {
      alert('반 설정 변경 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleUpdateStudentGroup = async (studentId: string, groupCode: string) => {
    try {
      await callAdmin({ action: 'updateStudent', studentId, groupCode: groupCode.trim() || null });
      setStudents(students.map(s => s.id === studentId ? { ...s, group_code: groupCode.trim() || null } : s));
    } catch (error: any) {
      alert('모둠 저장에 실패했습니다: ' + error.message);
    }
  };

  const handleUpdatePlantStats = async (studentId: string, column: string, value: number) => {
    if (isNaN(value)) return;
    try {
      await callAdmin({ action: 'updateStudent', studentId, ...(column === 'seed_level' ? { seedLevel: value } : { treeExp: value }) });
      setStudents(students.map(s => s.id === studentId ? { ...s, [column]: value } : s));
    } catch (error: any) {
      alert(`업데이트 실패: ${error.message}`);
    }
  };

  const handleDeletePlant = async (studentId: string, name: string) => {
    if (!window.confirm(`[${name}] 학생의 식물을 정말 삭제하시겠습니까?\n(씨앗 레벨 1, 경험치 0, 심기 상태 초기화)`)) return;
    
    try {
      await callAdmin({ action: 'resetPlant', studentId });
      setStudents(students.map(s => s.id === studentId ? { ...s, plant_growth: 0, seed_level: 1, tree_exp: 0 } : s));
      alert('식물이 성공적으로 삭제되었습니다.');
    } catch (error: any) {
      alert(`삭제 실패: ${error.message}`);
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

  // API 모델 진단 함수 (안전하게 서버리스 함수를 통해 점검)
  const checkApiModels = async () => {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}` },
        body: JSON.stringify({ action: 'checkModels' }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.feedbackText) {
          alert(`[설정 오류]\n${data.feedbackText}`);
        } else {
          alert(`[API 호출 오류]\n${data.error}`);
        }
        return;
      }
      
      alert(`✅ API 연동 정상 작동 중!\n\n사용 가능한 모델 수: ${data.models.length}개\n가장 안정적인 상태입니다.`);
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
            onClick={handleBetaResetAll}
            className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg shadow-sm hover:bg-red-200 transition-colors text-sm"
          >
            ⚠️ 전체 기록 초기화
          </button>
          <Link to="/student" className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-lg shadow-sm hover:bg-green-200 transition-colors text-sm">
            🌱 내 식물/상점 보기
          </Link>
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
            {loadingData ? '-' : students.filter(s => s.role === 'student').length}
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
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-800">학생 관리</h2>
              {selectedStudentIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteStudents}
                  className="px-3 py-1.5 bg-red-500 text-white font-bold rounded-lg shadow-sm hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  선택 삭제 ({selectedStudentIds.length})
                </button>
              )}
            </div>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gray-50 font-medium"
            >
              <option value="all">전체보기</option>
              {availableGrades.length > 0 && (
                <optgroup label="학년별">
                  {availableGrades.sort().map(g => (
                    <option key={`grade-${g}`} value={`grade-${g}`}>{g}학년 전체</option>
                  ))}
                </optgroup>
              )}
              {distinctClasses.length > 0 && (
                <optgroup label="반별 (상세)">
                  {distinctClasses.sort().map(cid => (
                    <option key={`class-${cid}`} value={`class-${cid}`}>{formatClassId(cid)}</option>
                  ))}
                </optgroup>
              )}
              <option value="unassigned">미지정 학생</option>
            </select>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100 sticky top-0 bg-white z-10">
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                      checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(filteredStudents.map(s => s.id));
                        } else {
                          setSelectedStudentIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">아이디 (학번)</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">가입일</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">작성한 독서록</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">소속 반</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm">모둠 코드</th>
                  <th className="py-3 px-4 text-gray-500 font-semibold text-sm text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">데이터 불러오는 중...</td></tr>
                ) : filteredStudents.filter(s => s.role === 'student').length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500 italic">조건에 맞는 학생이 없습니다.</td></tr>
                ) : (
                  filteredStudents.filter(s => s.role === 'student').map(student => {
                    const studentLogsCount = allLogs.filter(log => log.user_id === student.id).length;
                    return (
                      <tr key={student.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedStudentIds.includes(student.id) ? 'bg-purple-50/50' : ''}`}>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, student.id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                              }
                            }}
                          />
                        </td>
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
                        <td className="py-3 px-4">
                          <input
                            defaultValue={student.group_code || ''}
                            onBlur={(e) => handleUpdateStudentGroup(student.id, e.target.value)}
                            placeholder="예: G1"
                            className="w-20 p-1 border border-gray-200 rounded text-sm"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => handlePasswordReset(student.name)}
                              className="px-3 py-1 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-md text-xs font-bold transition-colors"
                              title="비밀번호 초기화 방법 안내"
                            >
                              비밀번호 초기화
                            </button>
                            <button 
                              onClick={() => handleDeleteStudent(student.id, student.name)}
                              className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-bold transition-colors"
                              title="학생 계정 삭제"
                            >
                              삭제
                            </button>
                          </div>
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

      {/* 학생 식물 및 나무 관리 섹션 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">학생(및 교사) 식물/나무 관리</h2>
        </div>
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100 sticky top-0 bg-white z-10">
                <th className="py-3 px-4 text-gray-500 font-semibold text-sm">사용자명 (역할)</th>
                <th className="py-3 px-4 text-gray-500 font-semibold text-sm">현재 식물 상태</th>
                <th className="py-3 px-4 text-gray-500 font-semibold text-sm">씨앗 레벨</th>
                <th className="py-3 px-4 text-gray-500 font-semibold text-sm">나무 경험치(EXP)</th>
                <th className="py-3 px-4 text-gray-500 font-semibold text-sm text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.filter(s => (s.plant_growth ?? 0) > 0 || (s.tree_exp ?? 0) > 0).length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500 italic">현재 심어진 식물이나 나무가 없습니다.</td></tr>
              ) : (
                filteredStudents.filter(s => (s.plant_growth ?? 0) > 0 || (s.tree_exp ?? 0) > 0).map(student => (
                  <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {student.name}
                      {student.role !== 'student' && <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">{student.role === 'admin' ? '관리자' : '교사'}</span>}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      {(() => {
                        const level = student.seed_level ?? 1;
                        const flower = (student.used_water ?? 0) + (student.used_sun ?? 0) + (student.used_wind ?? 0) >= level + 1;
                        if (flower) return '🌻 꽃';
                        if ((student.plant_growth ?? 0) >= 1 + Math.ceil((level + 1) / 2)) return '🌿 성장 중';
                        if ((student.plant_growth ?? 0) >= 1) return '🌱 씨앗';
                        return '❌ 없음';
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          defaultValue={student.seed_level ?? 1} 
                          onBlur={(e) => handleUpdatePlantStats(student.id, 'seed_level', parseInt(e.target.value))}
                          className="w-20 p-1 border border-gray-200 rounded text-sm text-gray-700 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          defaultValue={student.tree_exp ?? 0} 
                          onBlur={(e) => handleUpdatePlantStats(student.id, 'tree_exp', parseInt(e.target.value))}
                          className="w-20 p-1 border border-gray-200 rounded text-sm text-gray-700 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => handleDeletePlant(student.id, student.name)}
                        className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-bold transition-colors"
                      >
                        식물 삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                <th className="py-3 px-4 text-gray-500 font-semibold">수정 횟수</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">총 수정 일수</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">상세 수정 내역</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">점수 향상도</th>
                <th className="py-3 px-4 text-gray-500 font-semibold">AI 피드백 요약</th>
                <th className="py-3 px-4 text-gray-500 font-semibold text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {loadingData ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-500">데이터 불러오는 중...</td></tr>
              ) : allLogs.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-500 italic">아직 작성된 독서록이 없습니다.</td></tr>
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
                    <td className="py-3 px-4 text-sm text-gray-600">{log.edit_count || 0}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.edit_days ? `${log.edit_days}일` : '1일'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <button 
                        onClick={() => setViewLog(log)}
                        className="px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs font-bold transition-colors"
                      >
                        상세 보기
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.score_improvement !== undefined && log.score_improvement !== null ? `${log.score_improvement > 0 ? '+' : ''}${log.score_improvement}점` : '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-[200px]" title={log.ai_feedback}>
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

            {viewLog.revision_history && viewLog.revision_history.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex justify-between items-center">
                  <span>상세 수정 내역 (총 {viewLog.edit_days || 1}일 / {viewLog.edit_count || viewLog.revision_history.length}회 수정)</span>
                </h3>
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-3 text-gray-600 font-semibold">수정 차수</th>
                        <th className="py-2 px-3 text-gray-600 font-semibold">소요 시간</th>
                        <th className="py-2 px-3 text-gray-600 font-semibold">제출 일시</th>
                        <th className="py-2 px-3 text-gray-600 font-semibold">점수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewLog.revision_history.map((rev, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-white">
                          <td className="py-2 px-3 font-medium text-gray-800">{rev.day}일차 {rev.attempt}차</td>
                          <td className="py-2 px-3 text-gray-600">{rev.edit_time}초</td>
                          <td className="py-2 px-3 text-gray-500 text-xs">{new Date(rev.timestamp).toLocaleString('ko-KR')}</td>
                          <td className="py-2 px-3 font-bold text-purple-600">{rev.score}점</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
