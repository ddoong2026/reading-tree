import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import WriteLog from './pages/WriteLog';
import GameWorld from './components/GameWorld';
import WorldMap from './pages/WorldMap';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/map" element={<WorldMap />} />
        <Route path="/world/:classId?" element={<GameWorld />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/write" element={<WriteLog />} />
      </Routes>
    </Router>
  );
};

export default App;
