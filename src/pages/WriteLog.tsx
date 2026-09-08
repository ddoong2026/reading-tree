import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mic, Image as ImageIcon, Send, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { generateReadingFeedback, extractTextFromImage } from '../lib/geminiApi';
import { KDC_CATEGORIES } from '../lib/kdc';

const WriteLog: React.FC = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit_id');

  const [text, setText] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [category, setCategory] = useState('000');
  const [questCategory, setQuestCategory] = useState<string | null>(null);
  const [hasCheckedQuest, setHasCheckedQuest] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageType, setImageType] = useState<'drawing' | 'handwriting'>('drawing');
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOcrDone, setIsOcrDone] = useState(false);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [editDays, setEditDays] = useState(1);
  const [dailyAttempts, setDailyAttempts] = useState(0);
  const [lastEditDate, setLastEditDate] = useState<string | null>(null);
  const [revisionHistory, setRevisionHistory] = useState<any[]>([]);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStartTime, setEditStartTime] = useState<number>(Date.now());
  
  const { user, profile } = useAuth();
  const dashboardPath = (profile?.role === 'teacher' || profile?.role === 'admin') ? '/teacher' : '/student';

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              currentTranscript += event.results[i][0].transcript;
            }
          }
          if (currentTranscript) {
            setText((prev) => prev + (prev ? ' ' : '') + currentTranscript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      const q = localStorage.getItem(`quest_${user.id}`);
      setQuestCategory(q);
      if (q) setCategory(q);
      setHasCheckedQuest(true);
    }
  }, [user]);

  useEffect(() => {
    if (editId && user) {
      const fetchLog = async () => {
        const { data } = await supabase
          .from('reading_logs')
          .select('book_title, category, text_content, image_url, ai_feedback, attempts, edit_days, daily_attempts, last_edit_date, revision_history')
          .eq('id', editId)
          .single();
        if (data) {
          setBookTitle(data.book_title);
          setCategory(data.category);
          setText(data.text_content || '');
          if (data.attempts) setAttempts(data.attempts);
          if (data.edit_days) setEditDays(data.edit_days);
          if (data.daily_attempts) setDailyAttempts(data.daily_attempts);
          if (data.last_edit_date) setLastEditDate(data.last_edit_date);
          if (data.revision_history) setRevisionHistory(data.revision_history);
          
          if (data.image_url) {
            setImagePreview(data.image_url);
            setBase64Image(data.image_url);
          }
        }
      };
      fetchLog();
    }
  }, [editId, user]);

  const handleToggleRecord = () => {
    if (!recognitionRef.current) {
      alert("이 브라우저에서는 음성 인식 기능을 지원하지 않습니다. 크롬(Chrome) Edge, Safari 등의 지원 브라우저를 이용해주세요.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 실제 이미지 업로드 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageMimeType(file.type);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setBase64Image(result);
        setIsOcrDone(false); // 이미지가 변경되면 OCR 상태 초기화
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setBase64Image(null);
    setImageMimeType(null);
    setIsOcrDone(false);
  };

  // 제출 및 DB 연동
  const handleSubmit = async () => {
    if (!text.trim()) {
      alert('독서록 내용을 입력해주세요!');
      return;
    }
    if (!bookTitle.trim()) {
      alert('책 제목을 입력해주세요!');
      return;
    }
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    const targetId = editId || currentLogId;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let nextDailyAttempts = 1;
    let nextEditDays = 1;

    if (targetId) {
      if (lastEditDate === today) {
        nextDailyAttempts = dailyAttempts + 1;
        nextEditDays = editDays;
      } else {
        nextDailyAttempts = 1;
        nextEditDays = editDays + 1;
      }
    }

    if (nextDailyAttempts > 3) {
      alert('오늘 수정 기회(3회)를 모두 사용했습니다. 내일 다시 도전해주세요!');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // 1. 손글씨인 경우, 첫 클릭 시에는 OCR만 수행하고 종료 (저장 안 함)
      if (imageType === 'handwriting' && base64Image && imageMimeType && !isOcrDone) {
        const ocrText = await extractTextFromImage(base64Image, imageMimeType);
        const newContent = text ? `${text}\n\n[손글씨 내용]\n${ocrText}` : ocrText;
        setText(newContent); // 화면의 텍스트 상자에 입력하여 학생이 수정할 수 있게 함
        setIsOcrDone(true); // OCR 완료 상태로 변경
        setIsSubmitting(false);
        return; // 여기서 함수 종료! (DB 저장 안 함)
      }

      // 2. 이미지가 있다면 Supabase Storage에 업로드 (진짜 제출 시에만)
      let uploadedImageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('reading-log-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          uploadedImageUrl = 'https://via.placeholder.com/400x300?text=Upload+Failed+Dummy';
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('reading-log-images')
            .getPublicUrl(filePath);
          uploadedImageUrl = publicUrlData.publicUrl;
        }
      }

      // 3. AI 피드백 요청 (현재 텍스트상자의 최종 텍스트 기반)
      const aiResult = await generateReadingFeedback(text, !!uploadedImageUrl);
      const aiResponse = aiResult.feedbackText;

      if (!aiResult.success) {
        setIsSubmitting(false);
        alert('선생님 조언 오류: ' + aiResponse);
        return;
      }

      // 점수 추출 및 클린 텍스트 생성
      const match = aiResponse.match(/\[SCORE:\s*(\d+)\]/);
      const score = match ? parseInt(match[1], 10) : 0;
      const cleanAiResponse = aiResponse.replace(/\[SCORE:\s*\d+\]/g, '').trim();

      // 4. DB 저장
      let insertedData;
      
      if (targetId) {
        // 기존 시도 횟수 및 초기 점수 가져오기
        const { data: existingLog } = await supabase.from('reading_logs').select('attempts, initial_score').eq('id', targetId).single();
        const currentAttempts = existingLog?.attempts || 1;
        const initialScore = existingLog?.initial_score || score;
        const scoreImprovement = score - initialScore;
        const editDuration = Math.floor((Date.now() - editStartTime) / 1000);

        const newHistoryItem = {
          day: nextEditDays,
          attempt: nextDailyAttempts,
          edit_time: editDuration,
          score: score,
          timestamp: new Date().toISOString()
        };
        const updatedHistory = [...revisionHistory, newHistoryItem];

        let updatePayload: any = {
          book_title: bookTitle,
          category: category,
          text_content: text,
          image_url: uploadedImageUrl,
          ai_feedback: cleanAiResponse,
          attempts: currentAttempts + 1,
          final_score: score,
          score_improvement: scoreImprovement,
          edit_count: currentAttempts,
          
          last_edit_date: today,
          edit_days: nextEditDays,
          daily_attempts: nextDailyAttempts,
          revision_history: updatedHistory
        };

        const { data, error } = await supabase.from('reading_logs').update(updatePayload).eq('id', targetId).select().single();
        
        if (error) throw error;
        insertedData = data;
      } else {
        const newHistoryItem = {
          day: 1,
          attempt: 1,
          edit_time: 0,
          score: score,
          timestamp: new Date().toISOString()
        };

        const { data, error } = await supabase.from('reading_logs').insert({
          user_id: user.id,
          book_title: bookTitle,
          category: category,
          text_content: text,
          image_url: uploadedImageUrl,
          ai_feedback: cleanAiResponse,
          attempts: 1,
          initial_score: score,
          final_score: score,
          score_improvement: 0,
          edit_count: 0,
          
          last_edit_date: today,
          edit_days: 1,
          daily_attempts: 1,
          revision_history: [newHistoryItem]
        }).select().single();
        
        if (error) throw error;
        insertedData = data;
      }
      
      // 5. 포인트 지급 조건 확인 (70점 이상)
      const match = aiResponse.match(/\[SCORE:\s*(\d+)\]/);
      const score = match ? parseInt(match[1], 10) : 0;
      let earnedPoint = false;

      if (aiResult.success && score >= 70) {
        try {
          const { data: userData } = await supabase.from('users').select('points').eq('id', user.id).single();
          const currentPoints = userData?.points || 0;
          
          const { data: updateData, error: updateError } = await supabase.from('users')
            .update({ points: currentPoints + 1 })
            .eq('id', user.id)
            .select();

          if (updateError || !updateData || updateData.length === 0) {
            console.error("포인트 업데이트 DB 거부됨(RLS 정책 확인 필요):", updateError);
            alert("⚠️ 포인트 지급 실패! 데이터베이스(Supabase) 보안 정책(RLS) 때문에 점수가 저장되지 않았습니다. 관리자에게 'users 테이블의 UPDATE 정책' 추가를 요청하세요.");
            earnedPoint = false;
          } else {
            earnedPoint = true;
          }
        } catch (e) {
          console.error("포인트 업데이트 에러 발생:", e);
        }
      }
      
      setCurrentLogId(insertedData.id);
      setAttempts(insertedData.attempts);
      setEditDays(insertedData.edit_days);
      setDailyAttempts(insertedData.daily_attempts);
      setLastEditDate(insertedData.last_edit_date);
      setRevisionHistory(insertedData.revision_history);
      setEditStartTime(Date.now()); // 다음 수정을 위한 타이머 리셋
      setIsEditModalOpen(false); // 혹시 모달에서 호출되었다면 닫기

      const resultMessage = earnedPoint 
        ? "\n\n🎉 통과! 1 포인트를 얻었습니다!" 
        : `\n\n⚠️ 아쉽게도 통과 기준에 미치지 못했어요. (오늘 남은 기회: ${3 - insertedData.daily_attempts}번)\n대시보드에서 '다시 도전하기'를 눌러 수정해보세요!`;
      
      setFeedback(cleanAiResponse + "\n" + resultMessage);
    } catch (error: any) {
      alert('오류가 발생했습니다: ' + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };



  // TTS 더미 핸들러
  const handleSpeakFeedback = () => {
    if (!feedback) return;
    // 실제 Web Speech API (TTS) 연동
    const utterance = new SpeechSynthesisUtterance(feedback);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-green-50 p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-2xl">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-green-900">새 독서록 쓰기</h1>
          <Link to={dashboardPath} className="text-green-700 hover:underline">취소</Link>
        </header>

        {hasCheckedQuest && !questCategory ? (
          <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">현재 진행 중인 퀘스트가 없어요!</h2>
            <p className="text-gray-600 mb-8">대시보드에서 룰렛을 돌려 오늘의 독서 퀘스트를 받아주세요.</p>
            <Link to={dashboardPath} className="px-6 py-3 bg-green-500 text-white font-bold rounded-xl shadow-md hover:bg-green-600 transition-colors">
              대시보드로 돌아가기
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8">
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">어떤 분야의 책인가요?</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                {KDC_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    disabled={true}
                    className={`py-2 px-1 rounded-xl text-sm font-bold transition-all border-2 ${
                      category === c.id 
                        ? `${c.bgColor} text-white border-transparent shadow-md scale-105` 
                        : `bg-white ${c.color} border-gray-100 opacity-50`
                    }`}
                  >
                    {c.id} {c.name}
                  </button>
                ))}
              </div>
              
              <div className="text-sm text-green-600 mb-4 bg-green-50 p-2 rounded-lg inline-block font-medium">
                💡 퀘스트로 받은 분야의 책만 쓸 수 있어요!
              </div>
            
            <label className="block text-gray-700 font-semibold mb-2">어떤 책을 읽었나요?</label>
            <input 
              type="text" 
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="책 제목을 적어주세요"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <label className="block text-gray-700 font-semibold">기억에 남는 내용이나 느낌을 적어보세요!</label>
              
              {/* UDL: 마이크(STT) 버튼 */}
              <button 
                onClick={handleToggleRecord}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                  isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <Mic size={18} />
                {isRecording ? '듣는 중...' : '말로 쓰기'}
              </button>
            </div>
            
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="여기에 글을 쓰거나 '말로 쓰기' 버튼을 눌러 말해보세요."
              className="w-full p-4 min-h-[150px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 resize-y"
            ></textarea>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-gray-700 font-semibold">사진도 같이 올릴까요? (선택)</label>
              
              {/* 이미지 타입 선택 UI */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setImageType('drawing')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
                    imageType === 'drawing' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🎨 그림
                </button>
                <button
                  onClick={() => setImageType('handwriting')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
                    imageType === 'handwriting' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ✍️ 손글씨
                </button>
              </div>
            </div>
            
            {imageType === 'handwriting' && (
              <p className="text-sm text-green-600 mb-3 bg-green-50 p-2 rounded-lg inline-block">
                💡 손글씨를 사진으로 찍어 올리면, 제출할 때 나무요정 선생님이 글자로 읽어서 조언을 해줄 거예요!
              </p>
            )}

            {imagePreview ? (
              <div className="relative inline-block mt-2">
                <img src={imagePreview} alt="Uploaded" className="rounded-xl max-w-full h-auto max-h-64 border-2 border-green-200" />
                <button onClick={removeImage} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md text-red-500 hover:text-red-700">
                  ✕
                </button>
              </div>
            ) : (
              <label className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer mt-2">
                <ImageIcon size={32} className="mb-2 text-gray-400" />
                <span>카메라로 찍거나 앨범에서 사진 고르기</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange} 
                />
              </label>
            )}
          </div>

            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !bookTitle || (!text && !imageFile)}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl shadow-md flex justify-center items-center gap-2 transition-colors text-lg disabled:opacity-50"
            >
              <Send size={20} />
              {isSubmitting 
                ? (imageType === 'handwriting' && base64Image && !isOcrDone ? '글자 추출 중...' : '저장 중...') 
                : (imageType === 'handwriting' && base64Image && !isOcrDone ? '글자 추출하기' : '다 썼어요! (제출하기)')}
            </button>
          </div>
        )}

        {/* 선생님 조언 모달/영역 */}
        {feedback && (
          <div className="mt-6 bg-gradient-to-r from-green-100 to-blue-100 rounded-3xl p-6 shadow-sm border border-green-200 animate-fade-in-up">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                  👩‍🏫
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">나무요정 선생님</h3>
                  <p className="text-xs text-gray-500">선생님의 조언 도착!</p>
                </div>
              </div>
              
              {/* UDL: TTS 듣기 버튼 */}
              <button 
                onClick={handleSpeakFeedback}
                className="p-3 bg-white text-green-600 rounded-full shadow-sm hover:bg-green-50 transition-colors flex items-center gap-2 font-medium text-sm"
              >
                <Volume2 size={18} />
                <span>읽어주기</span>
              </button>
            </div>
            
            <p className="text-gray-800 leading-relaxed bg-white/60 p-4 rounded-xl">
              {feedback}
            </p>
            
            <div className="mt-4 flex gap-3 justify-end">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="px-6 py-2 bg-white text-blue-600 font-bold rounded-full shadow-sm hover:bg-blue-50 border border-blue-200"
              >
                내 글 다시 고치기
              </button>
              <Link to={dashboardPath} className="px-6 py-2 bg-white text-green-700 font-bold rounded-full shadow-sm hover:bg-green-50">
                대시보드로 돌아가기
              </Link>
            </div>
          </div>
        )}

        {/* 글 수정 팝업 모달 */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">내 독서록 수정하기</h2>
              
              <div className="mb-4 bg-green-50 p-4 rounded-xl text-green-900 text-sm">
                <strong>선생님의 피드백:</strong><br />
                {feedback}
              </div>

              <label className="block text-gray-700 font-semibold mb-2">선생님의 조언을 보고 내 글을 다듬어 보세요!</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full p-4 min-h-[200px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y mb-4"
              ></textarea>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
                >
                  취소
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '수정 중...' : '최종 제출'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WriteLog;
