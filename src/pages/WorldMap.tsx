import React from 'react';
import { Link } from 'react-router-dom';

const WorldMap: React.FC = () => {
  // 모의 반 데이터 (실제로는 Supabase의 classes 테이블에서 가져옵니다)
  const classes = [
    { id: 'class-1', name: '새싹 1반', treeLevel: 3, description: '가장 잎이 무성한 반' },
    { id: 'class-2', name: '햇살 2반', treeLevel: 2, description: '동물들이 많이 모이는 반' },
    { id: 'class-3', name: '푸른 3반', treeLevel: 1, description: '이제 막 자라나는 나무' },
  ];

  return (
    <div className="min-h-screen bg-sky-50 p-8 flex flex-col items-center">
      <header className="flex justify-between items-center w-full max-w-6xl mb-12">
        <h1 className="text-4xl font-black text-sky-900 drop-shadow-sm">독서오름나무 숲 (월드맵)</h1>
        <Link to="/" className="text-sky-700 font-bold hover:underline bg-white px-4 py-2 rounded-full shadow-sm">
          ← 메인으로
        </Link>
      </header>

      <div className="w-full max-w-6xl text-center mb-8">
        <p className="text-xl text-gray-700 bg-white/60 inline-block px-8 py-3 rounded-full backdrop-blur-sm shadow-sm font-medium">
          방문하고 싶은 반의 나무를 선택해서 놀러가보세요! 🌳
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {classes.map((cls) => (
          <Link 
            key={cls.id} 
            to={`/world/${cls.id}`}
            className="group relative bg-white rounded-3xl p-6 shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-4 border-transparent hover:border-green-400 flex flex-col items-center text-center overflow-hidden"
          >
            {/* 임시 썸네일 나무 이미지 배경 */}
            <div className="w-full h-48 bg-green-100 rounded-2xl mb-6 relative flex items-center justify-center overflow-hidden border border-green-200 group-hover:bg-green-200 transition-colors">
              <span className="text-6xl">🌳</span>
              <div className="absolute bottom-2 right-2 bg-white/90 px-3 py-1 rounded-full text-sm font-bold text-green-700 shadow-sm">
                Lv. {cls.treeLevel}
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{cls.name} 나무</h2>
            <p className="text-gray-500 font-medium">{cls.description}</p>
            
            <div className="mt-6 px-6 py-2 bg-green-500 text-white rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              방문하기 →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default WorldMap;
