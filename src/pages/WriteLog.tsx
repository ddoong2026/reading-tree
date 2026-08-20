import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Image as ImageIcon, Send, Volume2 } from 'lucide-react';

const WriteLog: React.FC = () => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // STT 더미 핸들러
  const handleToggleRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // 실제 Web Speech API 연동은 추후 구현
      setTimeout(() => {
        setText((prev) => prev + (prev ? ' ' : '') + '오늘 읽은 책은 정말 재미있었어요.');
        setIsRecording(false);
      }, 2000);
    }
  };

  // 더미 이미지 업로드 핸들러
  const handleImageUpload = () => {
    // 실제 Supabase Storage 연동은 추후 구현
    setImageUrl('https://via.placeholder.com/400x300?text=Uploaded+Drawing');
  };

  // 제출 및 더미 AI 피드백
  const handleSubmit = () => {
    if (!text && !imageUrl) return;
    
    // 모의 AI 피드백
    setFeedback('참 잘했어요! 글과 그림으로 책의 느낌을 멋지게 표현해주었네요. 앞으로도 독서오름나무와 함께 꾸준히 책을 읽어봐요! 🌳');
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
          <Link to="/student" className="text-green-700 hover:underline">취소</Link>
        </header>

        <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">어떤 책을 읽었나요?</label>
            <input 
              type="text" 
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
            <label className="block text-gray-700 font-semibold mb-2">그림으로도 표현해볼까요? (선택)</label>
            
            {imageUrl ? (
              <div className="relative inline-block">
                <img src={imageUrl} alt="Uploaded" className="rounded-xl max-w-full h-auto border-2 border-green-200" />
                <button onClick={() => setImageUrl(null)} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md text-red-500 hover:text-red-700">
                  ✕
                </button>
              </div>
            ) : (
              <button 
                onClick={handleImageUpload}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <ImageIcon size={32} className="mb-2 text-gray-400" />
                <span>직접 그린 그림 사진 올리기</span>
              </button>
            )}
          </div>

          <button 
            onClick={handleSubmit}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl shadow-md flex justify-center items-center gap-2 transition-colors text-lg"
          >
            <Send size={20} />
            다 썼어요! (제출하기)
          </button>
        </div>

        {/* AI 피드백 모달/영역 */}
        {feedback && (
          <div className="mt-6 bg-gradient-to-r from-green-100 to-blue-100 rounded-3xl p-6 shadow-sm border border-green-200 animate-fade-in-up">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                  👩‍🏫
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">나무요정 선생님</h3>
                  <p className="text-xs text-gray-500">AI 피드백 도착!</p>
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
            
            <div className="mt-4 flex justify-end">
              <Link to="/student" className="px-6 py-2 bg-white text-green-700 font-bold rounded-full shadow-sm hover:bg-green-50">
                대시보드로 돌아가기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WriteLog;
