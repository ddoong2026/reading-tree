import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Trash2 } from 'lucide-react';

interface ReadingLog {
  id: string;
  book_title: string;
  created_at: string;
  text_content: string | null;
  ai_feedback: string | null;
  image_url: string | null;
}

const StudentDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { studentId } = useParams<{ studentId?: string }>();

  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  const isTeacherView = !!studentId && profile?.role === 'teacher';
  const targetUserId = isTeacherView ? studentId : user?.id;

  useEffect(() => {
    if (!targetUserId) return;

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('reading_logs')
        .select('id, book_title, created_at, text_content, ai_feedback, image_url')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reading logs:', error);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    const fetchStudentName = async () => {
      if (isTeacherView) {
        const { data } = await supabase.from('users').select('name').eq('id', targetUserId).single();
        if (data) setStudentName(data.name || '');
      }
    };

    fetchLogs();
    fetchStudentName();
  }, [targetUserId, isTeacherView]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`'${title}' 독서록을 정말 삭제하시겠습니까?`)) return;

    const { data, error } = await supabase
      .from('reading_logs')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error deleting log:', error);
      alert('독서록 삭제에 실패했습니다.');
    } else if (data && data.length === 0) {
      alert('삭제 권한이 없거나 이미 삭제되었습니다.\n(Supabase에서 RLS DELETE 정책 설정을 확인해주세요)');
    } else {
      setLogs(logs.filter(log => log.id !== id));
      alert('독서록이 삭제되었습니다.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLogIds.length === 0) return;
    if (!window.confirm(`선택한 ${selectedLogIds.length}개의 독서록을 삭제하시겠습니까?`)) return;

    const { data, error } = await supabase
      .from('reading_logs')
      .delete()
      .in('id', selectedLogIds)
      .select();

    if (error) {
      console.error('Error deleting logs:', error);
      alert('독서록 삭제에 실패했습니다.');
    } else if (data && data.length === 0) {
      alert('삭제 권한이 없거나 이미 삭제되었습니다.\n(Supabase에서 RLS DELETE 정책 설정을 확인해주세요)');
    } else {
      setLogs(logs.filter(log => !selectedLogIds.includes(log.id)));
      setSelectedLogIds([]);
      alert(`${data?.length || selectedLogIds.length}개의 독서록이 삭제되었습니다.`);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-900">
          {isTeacherView ? `${studentName} 학생의 독서 기록` : '내 독서 기록'}
        </h1>
        {isTeacherView ? (
          <Link to="/teacher" className="text-blue-600 hover:underline font-bold">교사 대시보드로 돌아가기</Link>
        ) : (
          <Link to="/" className="text-blue-600 hover:underline font-bold">홈으로 돌아가기</Link>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                checked={logs.length > 0 && selectedLogIds.length === logs.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLogIds(logs.map(log => log.id));
                  } else {
                    setSelectedLogIds([]);
                  }
                }}
              />
              <h2 className="text-xl font-semibold text-gray-800">최근 작성한 독서록</h2>
            </div>
            {selectedLogIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-sm hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
              >
                <Trash2 size={16} />
                선택 삭제 ({selectedLogIds.length})
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="text-gray-500 py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              불러오는 중...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-gray-500 italic py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              아직 작성한 독서록이 없어요. 첫 독서록을 남겨볼까요?
            </div>
          ) : (
            <ul className="space-y-3">
              {logs.map(log => (
                <li key={log.id} className={`p-4 bg-blue-50/50 border ${selectedLogIds.includes(log.id) ? 'border-blue-400 bg-blue-100/50' : 'border-blue-100'} rounded-xl flex flex-col group cursor-pointer`} onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        checked={selectedLogIds.includes(log.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLogIds([...selectedLogIds, log.id]);
                          } else {
                            setSelectedLogIds(selectedLogIds.filter(id => id !== log.id));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800">{log.book_title}</span>
                        <span className="text-sm text-gray-500">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(log.id, log.book_title); }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="삭제하기"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {expandedLogId === log.id && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100 cursor-default" onClick={(e) => e.stopPropagation()}>
                      {log.image_url && (
                        <div className="mb-4">
                          <img src={log.image_url} alt="첨부 이미지" className="w-full max-w-md rounded-lg shadow-sm" />
                        </div>
                      )}
                      {log.text_content && (
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-gray-700 mb-1">내용</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{log.text_content}</p>
                        </div>
                      )}
                      {log.ai_feedback && (
                        <div className="bg-purple-50 p-4 rounded-lg mt-4 border border-purple-100">
                          <h4 className="text-sm font-bold text-purple-800 mb-2">AI 멘토의 피드백 ✨</h4>
                          <p className="text-purple-700 text-sm whitespace-pre-wrap leading-relaxed">{log.ai_feedback}</p>
                        </div>
                      )}
                      {!log.text_content && !log.image_url && !log.ai_feedback && (
                        <div className="text-gray-400 text-sm italic">내용이 없습니다.</div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {!isTeacherView && (
            <div className="mt-6 flex justify-end">
              <Link to="/write" className="px-6 py-3 bg-green-500 text-white rounded-full shadow-md hover:bg-green-600 transition-colors font-bold">
                + 새 독서록 쓰기
              </Link>
            </div>
          )}
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
              <span className="text-3xl font-bold text-green-600">{logs.length}</span>
              <span className="text-gray-500 mb-1">건</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (logs.length % 5) * 20)}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">다음 단계까지 {5 - (logs.length % 5)}건 남음</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
