import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Login: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // 어디서 넘어왔는지에 따라 문구를 다르게 보여주기 위함
  const isTeacherLogin = from === '/teacher';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // 사용자가 실수로 공백이나 @dokseo.app을 붙여서 썼을 경우 방지
    let cleanId = userId.trim().toLowerCase();
    if (cleanId.includes('@')) {
      cleanId = cleanId.split('@')[0];
    }
    
    // Supabase에서 순수 숫자로만 이루어진 이메일(예: 1101@...)을 거부하는 현상 방지
    const dummyEmail = /^\d+$/.test(cleanId) ? `s_${cleanId}@dokseo.app` : `${cleanId}@dokseo.app`;

    const { error } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password,
    });

    if (error) {
      console.error('Supabase Login Error:', error.message);
      if (error.message.includes('Email not confirmed')) {
        setErrorMsg('이메일 인증이 필요합니다. Supabase 설정에서 이메일 인증을 꺼주세요.');
      } else if (error.message.includes('Invalid login credentials')) {
        setErrorMsg('아이디 또는 비밀번호가 틀렸습니다.');
      } else {
        setErrorMsg(`로그인 실패: ${error.message}`);
      }
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-sky-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">{isTeacherLogin ? '👩‍🏫' : '🌳'}</div>
          <h1 className="text-2xl font-black text-gray-800">
            독서오름나무 {isTeacherLogin ? '선생님' : '학생'} 로그인
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {isTeacherLogin 
              ? '관리자 전용 아이디와 비밀번호를 입력하세요.'
              : '선생님이 발급해주신 계정으로 로그인하세요.'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">아이디</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="아이디를 입력하세요"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-2xl shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400">
          계정 발급 및 비밀번호 분실 시 관리자에게 문의해주세요.
        </div>
      </div>
    </div>
  );
};

export default Login;
