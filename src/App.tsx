import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import MainPage from './pages/MainPage';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import WriteLog from './pages/WriteLog';
import GameWorld from './components/GameWorld';
import WorldMap from './pages/WorldMap';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/map" element={<WorldMap />} />
          
          {/* GameWorld도 학생만 접근 가능하게 하거나, 읽기 전용으로 두거나 선택할 수 있음. 일단 로그인 필요 없이 맵에서 구경은 가능하도록 유지 */}
          <Route path="/world/:classId?" element={<GameWorld />} />
          
          <Route path="/student" element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/teacher" element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/write" element={
            <ProtectedRoute allowedRole="student">
              <WriteLog />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
