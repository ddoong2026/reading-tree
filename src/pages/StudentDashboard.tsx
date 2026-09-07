import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Trash2, Droplets, Sun, Wind, ShoppingBag, Info } from 'lucide-react';
import { KDC_CATEGORIES } from '../lib/kdc';

interface ReadingLog {
  id: string;
  book_title: string;
  category: string;
  created_at: string;
  text_content: string | null;
  ai_feedback: string | null;
  image_url: string | null;
}

interface UserStats {
  points: number;
  item_water: number;
  item_sun: number;
  item_wind: number;
  plant_growth: number;
}

const StudentDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { studentId } = useParams<{ studentId?: string }>();

  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ points: 0, item_water: 0, item_sun: 0, item_wind: 0, plant_growth: 0 });

  const isTeacherView = !!studentId && profile?.role === 'teacher';
  const targetUserId = isTeacherView ? studentId : user?.id;

  useEffect(() => {
    if (!targetUserId) return;

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('reading_logs')
        .select('id, book_title, category, created_at, text_content, ai_feedback, image_url')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reading logs:', error);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    const fetchUserStats = async () => {
      const { data } = await supabase.from('users').select('name, points, item_water, item_sun, item_wind, plant_growth').eq('id', targetUserId).single();
      if (data) {
        if (isTeacherView) setStudentName(data.name || '');
        setUserStats({
          points: data.points || 0,
          item_water: data.item_water || 0,
          item_sun: data.item_sun || 0,
          item_wind: data.item_wind || 0,
          plant_growth: data.plant_growth || 0
        });
      }
    };

    fetchLogs();
    fetchUserStats();
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

  const handleBuyItem = async (itemType: 'water' | 'sun' | 'wind') => {
    if (userStats.points < 1) {
      alert("포인트가 부족합니다! 독서록을 작성하여 포인트를 모아보세요.");
      return;
    }
    
    if (!window.confirm("1 포인트를 사용하여 이 아이템을 구매하시겠습니까?")) return;

    const column = `item_${itemType}`;
    const newStats = { 
      ...userStats, 
      points: userStats.points - 1, 
      [column]: userStats[column as keyof UserStats] + 1 
    };

    setUserStats(newStats);

    await supabase.from('users').update({ 
      points: newStats.points,
      [column]: newStats[column as keyof UserStats]
    }).eq('id', targetUserId);
  };

  const handleUseItem = async (itemType: 'water' | 'sun' | 'wind') => {
    const column = `item_${itemType}`;
    const currentCount = userStats[column as keyof UserStats];
    
    if (currentCount <= 0) {
      alert("아이템이 부족합니다! 상점에서 먼저 구매해주세요.");
      return;
    }

    const newStats = { 
      ...userStats, 
      [column]: currentCount - 1,
      plant_growth: userStats.plant_growth + 1
    };

    setUserStats(newStats);

    await supabase.from('users').update({ 
      [column]: newStats[column as keyof UserStats],
      plant_growth: newStats.plant_growth
    }).eq('id', targetUserId);
    
    alert("식물에게 아이템을 주었습니다! 식물이 조금 성장했어요.");
  };

  // KDC 읽은 카테고리 집합
  const readCategories = new Set(logs.map(log => log.category || '000'));
  const isFlower = readCategories.size >= 10;

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
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${KDC_CATEGORIES.find(c => c.id === log.category)?.bgColor || 'bg-gray-400'}`}>
                            {KDC_CATEGORIES.find(c => c.id === log.category)?.name || '분류 없음'}
                          </span>
                          <span>{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
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
          {/* 상점 및 포인트 */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl shadow-sm border border-amber-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                <ShoppingBag size={20} /> 새싹 상점
              </h2>
              <div className="bg-white px-3 py-1 rounded-full font-bold text-amber-600 shadow-sm border border-amber-200">
                💰 {userStats.points} P
              </div>
            </div>
            <p className="text-sm text-amber-700 mb-4 font-medium">독서록을 쓰고 모은 포인트로 식물을 키울 아이템을 사보세요! (각 1P)</p>
            
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => handleBuyItem('water')}
                disabled={isTeacherView}
                className="flex flex-col items-center p-2 bg-white rounded-xl shadow-sm hover:bg-blue-50 border border-blue-100 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-1">
                  <Droplets size={20} />
                </div>
                <span className="text-xs font-bold text-gray-700">물 주기</span>
              </button>
              <button 
                onClick={() => handleBuyItem('sun')}
                disabled={isTeacherView}
                className="flex flex-col items-center p-2 bg-white rounded-xl shadow-sm hover:bg-red-50 border border-red-100 transition-colors"
              >
                <div className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-1">
                  <Sun size={20} />
                </div>
                <span className="text-xs font-bold text-gray-700">햇빛 쬐기</span>
              </button>
              <button 
                onClick={() => handleBuyItem('wind')}
                disabled={isTeacherView}
                className="flex flex-col items-center p-2 bg-white rounded-xl shadow-sm hover:bg-teal-50 border border-teal-100 transition-colors"
              >
                <div className="w-10 h-10 bg-teal-100 text-teal-500 rounded-full flex items-center justify-center mb-1">
                  <Wind size={20} />
                </div>
                <span className="text-xs font-bold text-gray-700">바람 쐬기</span>
              </button>
            </div>
          </div>

          {/* 식물 성장 및 인벤토리 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col items-center relative overflow-hidden">
            <h2 className="text-lg font-bold mb-2 text-green-800 w-full text-left">내 식물 키우기</h2>
            
            <div className="w-full flex justify-between text-sm font-bold text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex flex-col items-center gap-1">
                <button onClick={() => handleUseItem('water')} disabled={isTeacherView} className="hover:scale-110 transition-transform">
                  <Droplets size={18} className="text-blue-500" />
                </button>
                <span>x {userStats.item_water}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button onClick={() => handleUseItem('sun')} disabled={isTeacherView} className="hover:scale-110 transition-transform">
                  <Sun size={18} className="text-red-500" />
                </button>
                <span>x {userStats.item_sun}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button onClick={() => handleUseItem('wind')} disabled={isTeacherView} className="hover:scale-110 transition-transform">
                  <Wind size={18} className="text-teal-500" />
                </button>
                <span>x {userStats.item_wind}</span>
              </div>
            </div>

            <div className="w-32 h-32 bg-green-50 rounded-full border-4 border-green-200 flex items-center justify-center text-5xl mb-4 shadow-inner relative overflow-hidden">
              {isFlower ? '🌻' : userStats.plant_growth >= 10 ? '🌿' : userStats.plant_growth >= 5 ? '🌱' : '🌰'}
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all" style={{ width: `${Math.min(100, (userStats.plant_growth % 5) * 20)}%` }}></div>
            </div>
            <p className="text-center text-xs text-gray-500 font-medium">
              {isFlower ? '꽃이 활짝 피었어요! 축하합니다!' : '아이템을 주어 식물을 키워보세요!'}
            </p>
          </div>

          {/* KDC 독서 스탬프 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-gray-800">10분야 독서 스탬프</h2>
              <div className="group relative">
                <Info size={16} className="text-gray-400 cursor-help" />
                <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded shadow-lg w-48 z-10 bottom-full mb-2 -left-4">
                  한국십진분류표(KDC)의 10가지 분야 책을 모두 골고루 읽으면 예쁜 꽃이 피어납니다!
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {KDC_CATEGORIES.map(category => {
                const hasRead = readCategories.has(category.id);
                return (
                  <div 
                    key={category.id} 
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                      hasRead 
                        ? `${category.bgColor} border-transparent text-white shadow-md scale-105 transform` 
                        : 'bg-gray-50 border-gray-100 text-gray-400 grayscale'
                    }`}
                    title={category.name}
                  >
                    <span className="font-black text-sm">{category.id.charAt(0)}</span>
                    <span className="text-[10px] font-bold mt-1 truncate w-full text-center">{category.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-between items-center text-sm font-bold">
              <span className="text-gray-500">달성도</span>
              <span className="text-green-600">{readCategories.size} / 10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
