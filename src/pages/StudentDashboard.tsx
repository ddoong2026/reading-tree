import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Trash2, ShoppingBag, Info } from 'lucide-react';
import { KDC_CATEGORIES } from '../lib/kdc';

interface ReadingLog {
  id: string;
  book_title: string;
  category: string;
  created_at: string;
  text_content: string | null;
  ai_feedback: string | null;
  image_url: string | null;
  attempts?: number;
}

interface UserStats {
  points: number;
  item_water: number;
  item_sun: number;
  item_wind: number;
  plant_growth: number;
  class_id: string | null;
  seed_level: number;
  used_water: number;
  used_sun: number;
  used_wind: number;
  rabbit_count: number;
}

const StudentDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { studentId } = useParams<{ studentId?: string }>();

  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ points: 0, item_water: 0, item_sun: 0, item_wind: 0, plant_growth: 0, class_id: null, seed_level: 1, used_water: 0, used_sun: 0, used_wind: 0, rabbit_count: 0 });

  // 건의사항 관련 상태
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // 퀘스트 및 룰렛 관련 상태
  const [questCategoryId, setQuestCategoryId] = useState<string | null>(null);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<any | null>(null);
  const [showQuestComplete, setShowQuestComplete] = useState(false);
  const [hasCompletedToday, setHasCompletedToday] = useState(false);

  const isTeacherView = !!studentId && ['teacher', 'admin'].includes(profile?.role ?? '');
  const targetUserId = isTeacherView ? studentId : user?.id;

  useEffect(() => {
    if (!targetUserId) return;

    const loadData = async () => {
      setLoading(true);
      const [logsResponse, statsResponse] = await Promise.all([
        supabase
          .from('reading_logs')
          .select('id, book_title, category, created_at, text_content, ai_feedback, image_url, attempts')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('name, points, item_water, item_sun, item_wind, plant_growth, class_id, seed_level, used_water, used_sun, used_wind, rabbit_count')
          .eq('id', targetUserId)
          .single()
      ]);

      if (logsResponse.error) console.error('Error fetching logs:', logsResponse.error);
      const fetchedLogs = logsResponse.data || [];
      setLogs(fetchedLogs);

      if (statsResponse.data) {
        const d = statsResponse.data;
        if (isTeacherView) setStudentName(d.name || '');
        
        setUserStats(prev => ({
          ...prev,
          points: d.points || 0,
          item_water: d.item_water || 0,
          item_sun: d.item_sun || 0,
          item_wind: d.item_wind || 0,
          plant_growth: d.plant_growth || 0,
          class_id: d.class_id || null,
          seed_level: d.seed_level || 1,
          used_water: d.used_water || 0,
          used_sun: d.used_sun || 0,
          used_wind: d.used_wind || 0,
          rabbit_count: d.rabbit_count || 0
        }));
      }
      setLoading(false);
    };

    loadData();
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

  const handleBuySeed = async () => {
    if (userStats.points < 1) {
      alert("포인트가 부족합니다! 독서록을 작성하여 포인트를 모아보세요.");
      return;
    }
    
    // Check if they can buy a seed (must have no plant, or current plant must be a flower)
    const isFlower = userStats.used_water + userStats.used_sun + userStats.used_wind >= userStats.seed_level + 1;

    if (userStats.plant_growth > 0 && !isFlower) {
      alert("씨앗은 꽃을 피운 후에만 새로 구매할 수 있습니다.");
      return;
    }
    
    if (!window.confirm("1 포인트를 사용하여 식물 씨앗을 구매하시겠습니까?")) return;

    if (isTeacherView) return;
    const { data, error } = await supabase.rpc('buy_seed');

    if (error) {
      alert(`DB 업데이트 오류 발생: ${error.message} (권한이 없거나 네트워크 오류입니다.)`);
      return;
    }

    if (!data) {
      alert("⚠️ 데이터베이스에 적용되지 않았습니다! (Supabase RLS UPDATE 정책이 설정되어 있는지 확인해주세요.)");
      return;
    }

    setUserStats(prev => ({ 
      ...prev, 
      points: data.points,
      plant_growth: data.plant_growth,
      seed_level: data.seed_level,
      used_water: data.used_water,
      used_sun: data.used_sun,
      used_wind: data.used_wind
    }));

    alert(`레벨 ${data.seed_level} 씨앗을 구매했습니다! 숲으로 가서 심어주세요.`);
  };

  const handleBuyItem = async (itemType: 'water' | 'sun' | 'wind') => {
    if (userStats.points < 1) {
      alert("포인트가 부족합니다! 독서록을 작성하여 포인트를 모아보세요.");
      return;
    }
    
    if (!window.confirm("1 포인트를 사용하여 이 아이템을 구매하시겠습니까?")) return;

    const dbColumn = `item_${itemType}` as 'item_water' | 'item_sun' | 'item_wind';
    if (isTeacherView) return;
    const { data, error } = await supabase.rpc('buy_item', { p_item: itemType });
    if (error || !data) {
      alert(`구매에 실패했습니다: ${error?.message ?? '알 수 없는 오류'}`);
      return;
    }
    setUserStats(prev => ({ ...prev, points: data.points, [dbColumn]: data[dbColumn] }));
  };

  const handleBuyRabbit = async () => {
    if (userStats.points < 3) {
      alert('토끼 친구를 맞이하려면 3포인트가 필요해요.');
      return;
    }
    if (!window.confirm('3 포인트로 숲 토끼 친구를 맞이하시겠습니까?')) return;
    if (isTeacherView) return;

    const { data, error } = await supabase.rpc('buy_rabbit_companion');
    if (error || !data) {
      alert(`토끼 친구 구매에 실패했습니다: ${error?.message ?? '알 수 없는 오류'}`);
      return;
    }
    setUserStats(prev => ({ ...prev, points: data.points, rabbit_count: data.rabbit_count }));
    alert('토끼 친구가 숲에 왔어요! 식물이 있는 숲에서 만나보세요.');
  };



  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    
    try {
      const { error } = await supabase.from('student_feedbacks').insert([
        { user_id: targetUserId, content: feedbackText.trim() }
      ]);
      
      if (error) throw error;
      
      alert("의견이 성공적으로 전달되었습니다! 선생님과 개발자가 참고할게요.");
      setIsFeedbackModalOpen(false);
      setFeedbackText('');
    } catch (err: any) {
      console.error(err);
      alert("건의사항 제출에 실패했습니다: " + err.message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const passedLogs = React.useMemo(() => {
    return logs.filter(log => {
      const match = log.ai_feedback?.match(/\[SCORE:\s*(\d+)\]/);
      const score = match ? parseInt(match[1]) : 0;
      return score >= 70;
    });
  }, [logs]);

  const readCategories = React.useMemo(() => new Set(passedLogs.map(log => log.category || '000')), [passedLogs]);
  const hasAllCategories = readCategories.size >= 10;
  
  const isPlantFlower = userStats.used_water + userStats.used_sun + userStats.used_wind >= userStats.seed_level + 1;
  const plantCareCount = userStats.used_water + userStats.used_sun + userStats.used_wind;
  const plantCareRequired = userStats.seed_level + 1;

  useEffect(() => {
    if (!targetUserId || loading) return;
    const savedQuest = localStorage.getItem(`quest_${targetUserId}`);
    const lastQuestDate = localStorage.getItem(`quest_date_${targetUserId}`);
    const today = new Date().toISOString().split('T')[0];

    if (savedQuest) {
      if (readCategories.has(savedQuest)) {
        localStorage.removeItem(`quest_${targetUserId}`);
        setQuestCategoryId(null);
        setShowQuestComplete(true);
        if (lastQuestDate === today) {
          setHasCompletedToday(true);
        }
      } else {
        setQuestCategoryId(savedQuest);
      }
    } else {
      if (lastQuestDate === today) {
        setHasCompletedToday(true);
      }
    }
  }, [targetUserId, readCategories, loading]);

  const handleSpinRoulette = () => {
    const unreadCategories = KDC_CATEGORIES.filter(c => !readCategories.has(c.id));
    if (unreadCategories.length === 0) {
      alert("이미 모든 분야의 책을 읽으셨습니다! 대단해요!");
      return;
    }
    
    setIsRouletteOpen(true);
    setIsSpinning(true);
    
    let spinCount = 0;
    const maxSpins = 20;
    const interval = setInterval(() => {
      const randomCat = unreadCategories[Math.floor(Math.random() * unreadCategories.length)];
      setRouletteResult(randomCat);
      spinCount++;
      if (spinCount >= maxSpins) {
        clearInterval(interval);
        setIsSpinning(false);
        const finalCategory = unreadCategories[Math.floor(Math.random() * unreadCategories.length)];
        setRouletteResult(finalCategory);
        setQuestCategoryId(finalCategory.id);
        if (targetUserId) {
          localStorage.setItem(`quest_${targetUserId}`, finalCategory.id);
          localStorage.setItem(`quest_date_${targetUserId}`, new Date().toISOString().split('T')[0]);
        }
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            {isTeacherView ? `${studentName} 학생의 독서 기록` : '내 독서 기록'}
          </h1>
          {!isTeacherView && userStats.class_id && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg shadow-sm">🌱 나의 소속 반: {
                userStats.class_id === 'class-1' ? '5학년 1반' : 
                userStats.class_id === 'class-2' ? '5학년 2반' : '관리자의 숲'
              }</label>
            </div>
          )}
        </div>
        {isTeacherView ? (
          <Link to="/teacher" className="text-blue-600 hover:underline font-bold mt-2">교사 대시보드로 돌아가기</Link>
        ) : (
          <div className="flex gap-4">
            <button 
              onClick={() => setIsFeedbackModalOpen(true)}
              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold shadow-sm hover:bg-indigo-200 transition-colors"
            >
              💌 개발자/선생님께 건의하기
            </button>
            <Link
              to={userStats.class_id ? `/world/${userStats.class_id}` : (profile?.role !== 'student' ? '/world/class-3' : '/map')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold shadow-sm hover:bg-green-600 transition-colors"
            >
              🌳 숲으로 돌아가기
            </Link>
            <Link to="/" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-bold shadow-sm hover:bg-blue-200 transition-colors">🏠 홈으로 돌아가기</Link>
          </div>
        )}
      </header>

      {questCategoryId && !isTeacherView && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-md mb-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h2 className="text-lg font-bold">오늘의 독서 퀘스트</h2>
              <p className="text-indigo-100 text-sm font-medium">
                <strong className="text-yellow-300">[{KDC_CATEGORIES.find(c => c.id === questCategoryId)?.name}]</strong> 분야의 책을 찾아 읽고 독서록을 남겨주세요!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {showQuestComplete && !isTeacherView && (
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 p-4 rounded-2xl shadow-md mb-6 flex justify-between items-center text-white animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h2 className="text-lg font-bold">퀘스트 완료!</h2>
              <p className="text-green-50 text-sm font-medium">
                멋져요! 퀘스트로 받은 분야의 책을 다 읽었습니다. 내일 새로운 퀘스트를 다시 봅아볼까요?
              </p>
            </div>
          </div>
          <button onClick={() => setShowQuestComplete(false)} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors">닫기</button>
        </div>
      )}

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
                      {log.ai_feedback && (() => {
                        const scoreMatch = log.ai_feedback.match(/\[SCORE:\s*(\d+)\]/);
                        const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
                        const cleanFeedback = log.ai_feedback.replace(/\[SCORE:\s*\d+\]/g, '').trim();
                        const attempts = log.attempts || 1;
                        const canRetry = score < 70 && attempts < 3;
                        return (
                          <>
                            <div className="bg-purple-50 p-4 rounded-lg mt-4 border border-purple-100">
                              <h4 className="text-sm font-bold text-purple-800 mb-2">선생님의 조언 ✨</h4>
                              <p className="text-purple-700 text-sm whitespace-pre-wrap leading-relaxed">{cleanFeedback}</p>
                            </div>
                            {canRetry && !isTeacherView && (
                              <div className="mt-4 flex justify-end">
                                <Link to={`/write?edit_id=${log.id}`} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-lg shadow-sm transition-colors text-sm">
                                  ✏️ 수정하고 다시 도전하기 (남은 기회: {3 - attempts}번)
                                </Link>
                              </div>
                            )}
                          </>
                        );
                      })()}
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
                <ShoppingBag size={20} /> 5학년 상점
              </h2>
              <div className="flex gap-2">
                {profile?.role === 'teacher' && (
                  <button 
                    onClick={async () => {
                      const newPoints = userStats.points + 10;
                      setUserStats(prev => ({ ...prev, points: newPoints }));
                      if (targetUserId) await supabase.from('users').update({ points: newPoints }).eq('id', targetUserId);
                      alert('DB에 직접 10포인트가 추가되었습니다.');
                    }}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-full font-bold text-xs shadow-sm border border-purple-200 transition-colors"
                  >
                    + 테스트 10P
                  </button>
                )}
                <div className="bg-white px-3 py-1 rounded-full font-bold text-amber-600 shadow-sm border border-amber-200">
                  💰 {userStats.points} P
                </div>
              </div>
            </div>
            <p className="text-sm text-amber-700 mb-4 font-medium">독서록을 쓰고 모은 포인트로 식물 아이템과 숲 친구를 사보세요!</p>
            
            <div className="grid grid-cols-4 gap-2">
              <button 
                onClick={() => handleBuySeed()}
                disabled={isTeacherView || (userStats.plant_growth > 0 && !isPlantFlower)}
                className={`flex flex-col items-center p-2 rounded-xl shadow-sm border transition-colors ${userStats.plant_growth > 0 && !isPlantFlower ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white hover:bg-amber-50 border-amber-200'}`}
              >
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mb-1 p-1">
                  <img src="/seed.png" alt="씨앗" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold text-gray-700">씨앗 사기</span>
              </button>
              <button 
                onClick={() => handleBuyItem('water')}
                disabled={isTeacherView || userStats.plant_growth === 0}
                className={`flex flex-col items-center p-2 rounded-xl shadow-sm border transition-colors ${userStats.plant_growth === 0 ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white hover:bg-blue-50 border-blue-100'}`}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-1 p-1.5">
                  <img src="/water.png" alt="물" className="w-full h-full object-contain drop-shadow-sm" />
                </div>
                <span className="text-xs font-bold text-gray-700">물 주기</span>
              </button>
              <button 
                onClick={() => handleBuyItem('sun')}
                disabled={isTeacherView || userStats.plant_growth === 0}
                className={`flex flex-col items-center p-2 rounded-xl shadow-sm border transition-colors ${userStats.plant_growth === 0 ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white hover:bg-red-50 border-red-100'}`}
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-1 p-1">
                  <img src="/sun.png" alt="햇빛" className="w-full h-full object-contain drop-shadow-sm" />
                </div>
                <span className="text-xs font-bold text-gray-700">햇빛 쬐기</span>
              </button>
              <button 
                onClick={() => handleBuyItem('wind')}
                disabled={isTeacherView || userStats.plant_growth === 0}
                className={`flex flex-col items-center p-2 rounded-xl shadow-sm border transition-colors ${userStats.plant_growth === 0 ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-white hover:bg-teal-50 border-teal-100'}`}
              >
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mb-1 p-1">
                  <img src="/wind.png" alt="바람" className="w-full h-full object-contain drop-shadow-sm" />
                </div>
                <span className="text-xs font-bold text-gray-700">바람 쐬기</span>
              </button>
              <button
                onClick={handleBuyRabbit}
                disabled={isTeacherView}
                className="flex flex-col items-center p-2 rounded-xl shadow-sm border bg-white hover:bg-lime-50 border-lime-200 transition-colors disabled:bg-gray-100 disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-lime-100 rounded-full flex items-center justify-center mb-1 overflow-hidden">
                  <img src="/animals/rabbit-companion.png" alt="토끼 친구" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold text-gray-700">토끼 친구 · 3P</span>
              </button>
            </div>
          </div>

          {/* 식물 성장 및 인벤토리 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col items-center relative overflow-hidden">
            <h2 className="text-lg font-bold mb-2 text-green-800 w-full text-left">내 식물 키우기</h2>
            
            <div className="w-full flex justify-between text-sm font-bold text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 p-1">
                  <img src="/water.png" alt="물" className="w-full h-full object-contain" />
                </div>
                <span>x {userStats.item_water}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 p-1">
                  <img src="/sun.png" alt="햇빛" className="w-full h-full object-contain" />
                </div>
                <span>x {userStats.item_sun}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 p-1">
                  <img src="/wind.png" alt="바람" className="w-full h-full object-contain" />
                </div>
                <span>x {userStats.item_wind}</span>
              </div>
            </div>

            <div className="w-32 h-32 bg-green-50 rounded-full border-4 border-green-200 flex items-center justify-center text-5xl mb-4 shadow-inner relative overflow-hidden p-2">
              {isPlantFlower ? '🌻' : userStats.plant_growth >= 1 + userStats.seed_level * 2 ? '🌿' : userStats.plant_growth >= 1 + userStats.seed_level ? '🌱' : userStats.plant_growth >= 1 ? <img src="/seed.png" alt="씨앗" className="w-16 h-16 object-contain" /> : '❓'}
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all" style={{ width: `${Math.min(100, (plantCareCount / plantCareRequired) * 100)}%` }}></div>
            </div>
            <p className="text-center text-xs text-gray-500 font-medium">
              {isPlantFlower ? '꽃이 활짝 피었어요! 새로운 씨앗을 구매하세요!' : userStats.plant_growth === 0 ? '상점에서 씨앗을 먼저 구매해주세요!' : `성장 진행: ${plantCareCount} / ${plantCareRequired} (아이템을 자유롭게 사용하세요)`}
            </p>
            <Link 
              to={userStats.class_id ? `/world/${userStats.class_id}` : (profile?.role !== 'student' ? "/world/class-3" : "/map")} 
              className="mt-4 px-5 py-2 w-full text-center bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl shadow-sm border border-emerald-200 transition-colors"
            >
              🌲 숲으로 가서 내 식물 보기 (심기)
            </Link>
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
            
            {!isTeacherView && !hasAllCategories && !questCategoryId && (
              hasCompletedToday ? (
                <div className="mt-6 w-full py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-center border border-gray-200 shadow-sm">
                  👏 오늘의 퀘스트를 완료했습니다! 내일 다시 뽑아주세요.
                </div>
              ) : (
                <button 
                  onClick={handleSpinRoulette}
                  className="mt-6 w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold rounded-xl shadow-md transition-all flex justify-center items-center gap-2 group"
                >
                  <span className="group-hover:rotate-180 transition-transform duration-500">🎲</span> 
                  오늘의 독서 퀘스트 뽑기
                </button>
              )
            )}
          </div>
        </div>
      </div>
      {/* 건의사항 모달 */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 relative">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">💌 개발자/선생님께 건의하기</h2>
            <p className="text-gray-500 text-sm mb-6">
              앱을 사용하면서 불편했던 점, 추가되었으면 하는 기능, 혹은 하고 싶은 말을 자유롭게 남겨주세요.
              <br/>작성한 내용은 선생님과 관리자만 볼 수 있습니다.
            </p>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="여기에 의견을 적어주세요..."
              className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-gray-50 mb-6"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setIsFeedbackModalOpen(false); setFeedbackText(''); }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                disabled={isSubmittingFeedback}
              >
                취소
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={isSubmittingFeedback || !feedbackText.trim()}
                className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {isSubmittingFeedback ? '전송 중...' : '전송하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 룰렛 모달 */}
      {isRouletteOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 relative flex flex-col items-center text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">🎲 운명의 룰렛!</h2>
            
            <div className={`w-40 h-40 rounded-full flex items-center justify-center mb-6 shadow-inner border-8 transition-colors duration-200 ${rouletteResult ? rouletteResult.bgColor : 'bg-gray-100 border-gray-200'}`}>
              <div className="text-3xl font-black text-white drop-shadow-md">
                {rouletteResult ? rouletteResult.name : '?'}
              </div>
            </div>
            
            <div className="h-16">
              {isSpinning ? (
                <p className="text-gray-500 font-medium animate-pulse">두구두구두구...</p>
              ) : (
                <div className="animate-fade-in-up">
                  <p className="text-indigo-600 font-bold text-lg mb-1">당첨!</p>
                  <p className="text-gray-700 text-sm">
                    다음 책은 <strong className="text-indigo-600">[{rouletteResult?.name}]</strong> 분야에서 골라볼까요?
                  </p>
                </div>
              )}
            </div>
            
            {!isSpinning && (
              <button 
                onClick={() => setIsRouletteOpen(false)}
                className="mt-6 w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow transition-colors"
              >
                퀘스트 수락하기!
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
