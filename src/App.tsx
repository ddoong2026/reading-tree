import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
const MainPage = lazy(() => import('./pages/MainPage'));
const Login = lazy(() => import('./pages/Login'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const WriteLog = lazy(() => import('./pages/WriteLog'));
const GameWorld = lazy(() => import('./components/GameWorld'));
const WorldMap = lazy(() => import('./pages/WorldMap'));

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-blue-50">로딩 중...</div>}>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/map" element={<WorldMap />} />
          
          {/* GameWorld도 학생만 접근 가능하게 하거나, 읽기 전용으로 두거나 선택할 수 있음. 일단 로그인 필요 없이 맵에서 구경은 가능하도록 유지 */}
          <Route path="/world/:classId?" element={<GameWorld />} />
          
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/student/:studentId" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/teacher" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/write" element={
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <WriteLog />
            </ProtectedRoute>
          } />
        </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
};

export default App;
