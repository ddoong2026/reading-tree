import React, { useState } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';

interface TreeModelProps {
  position?: [number, number, number];
  scale?: number;
  disableMenu?: boolean;
}

export const TreeModel: React.FC<TreeModelProps> = ({ position = [0, 0, 0], scale = 25, disableMenu = false }) => {
  // tree4.glb 파일을 로드합니다.
  const { scene } = useGLTF('/tree4.glb');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleTreeClick = (e: ThreeEvent<MouseEvent>) => {
    if (disableMenu) return; // 비활성화 상태면 이벤트를 막지 않고 부모(부유섬)로 통과시킴
    e.stopPropagation(); // 클릭 이벤트가 땅(바닥)으로 전달되지 않게 차단
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <group position={position}>
      <primitive 
        object={scene.clone()} 
        scale={scale} 
        castShadow 
        receiveShadow 
        onClick={handleTreeClick}
      />
      
      {/* 3D 플로팅 UI (말풍선 메뉴) */}
      {isMenuOpen && (
        <Html 
          position={[0, -10, 5]} // 나무 그룹(y=15) 기준으로 아래(-10)로 내려서 사람 눈높이에 맞춤
          center 
          zIndexRange={[100, 0]} // 다른 HTML 요소보다 위에 표시되도록 설정
        >
          <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border-4 border-green-500 flex flex-col gap-3 min-w-[200px] transform transition-all">
            <h3 className="text-xl font-black text-green-800 text-center mb-2 border-b-2 border-green-100 pb-2">
              🌳 나무 요정의 메뉴
            </h3>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/write'); }}
              className="w-full px-4 py-2 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold rounded-xl shadow-sm transition-colors text-left flex items-center gap-2"
            >
              <span>✍️</span> 독서록 쓰기
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/student'); }}
              className="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-xl shadow-sm transition-colors text-left flex items-center gap-2"
            >
              <span>👀</span> 독서록 구경하기
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }}
              className="mt-2 text-sm text-gray-400 hover:text-gray-600 font-bold text-center underline"
            >
              닫기
            </button>
          </div>
        </Html>
      )}
    </group>
  );
};

// 사전 로드 (성능 최적화)
useGLTF.preload('/tree4.glb');
