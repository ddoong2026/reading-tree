import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Sparkles } from '@react-three/drei';
import { Link, useParams } from 'react-router-dom';
import * as THREE from 'three';

import { TreeModel } from './world3d/TreeModel';
import { CharacterModel } from './world3d/CharacterModel';
import { PetModel } from './world3d/PetModel';

// 완전한 단색(흰색) 구름 컴포넌트
const SimpleCloud = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[3, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
    <mesh position={[2.5, -0.5, 0]}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
    <mesh position={[-2.5, -0.5, 0]}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
  </group>
);

const GameWorld: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const [characterTarget, setCharacterTarget] = useState<THREE.Vector3 | null>(null);
  
  // 나무 레벨업 테스트용 상태 (초기값: 3반이면 1, 아니면 3)
  const initialLevel = classId === 'class-3' ? 1 : 3;
  const [treeLevel, setTreeLevel] = useState(initialLevel);

  // 바닥(땅) 클릭 핸들러
  const handleGroundClick = (event: ThreeEvent<PointerEvent>) => {
    // R3F에서 event.point는 내부적으로 재사용되므로 반드시 clone() 해야 합니다.
    setCharacterTarget(event.point.clone());
  };

  const petsList = React.useMemo(() => {
    const pets: React.ReactNode[] = [];
    const petTypes: Array<string> = ['Meshy_AI_Character_output (1)'];
    
    // WebGL Context Lost(메모리 초과) 에러를 막기 위해 마릿수를 극단적으로 줄입니다.
    let count = 1; // 기본 (1반)
    if (classId === 'class-2') count = 2;
    if (classId === 'class-3') count = 1;

    for (let i = 0; i < count; i++) {
      const type = petTypes[Math.floor(Math.random() * petTypes.length)];
      
      const charX = 0;
      const charZ = 8;
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 4;
      const x = charX + Math.cos(angle) * radius;
      const z = charZ + Math.sin(angle) * radius;
      
      pets.push(<PetModel key={i} type={type} initialPosition={[x, 0, z]} />);
    }
    return pets;
  }, [classId]);

  // 디버깅용 로그
  console.log("Spawning pets count:", petsList.length);

  // 바닥에 깔릴 잔디(풀) 모형들 생성
  const grassList = React.useMemo(() => {
    const grasses: React.ReactNode[] = [];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scaleY = 0.5 + Math.random() * 1.5;
      
      grasses.push(
        <mesh key={`grass-${i}`} position={[x, scaleY / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[0.2, scaleY, 0.2]} />
          <meshStandardMaterial color="#66b032" />
        </mesh>
      );
    }
    return grasses;
  }, []);

  return (
    <div className="relative w-full h-screen bg-sky-200 overflow-hidden">
      {/* 3D 캔버스 영역 */}
      <Canvas shadows camera={{ position: [0, 8, 18], fov: 45 }}>
        <Suspense fallback={null}>
          {/* 환경 빛 세팅 */}
          <ambientLight intensity={0.6} />
          <directionalLight 
            castShadow 
            position={[10, 20, 10]} 
            intensity={1.2} 
            shadow-mapSize={[2048, 2048]}
          />
          
          {/* 하늘과 구름 세팅 (명확한 하늘색 바탕에 흰 구름) */}
          <color attach="background" args={['#87CEEB']} />
          <SimpleCloud position={[-15, 20, -25]} scale={2} />
          <SimpleCloud position={[20, 25, -30]} scale={3} />

          {/* 에셋 렌더링 */}
          <CharacterModel targetPosition={characterTarget} />
          
          {/* 정상적인 펫 리스트 렌더링 */}
          {petsList}
          
          {grassList}

          {/* 바닥 잔디 주변 마법 효과 (반딧불이/포자 느낌) */}
          <Sparkles count={200} scale={40} size={4} speed={0.4} opacity={0.5} color="#b4f8c8" position={[0, 2, 0]} />

          {/* 메인 거대한 나무 */}
          <TreeModel position={[0, 0, 0]} level={treeLevel} />

          {/* 바닥 (클릭하여 캐릭터 이동) */}
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, 0, 0]} 
            receiveShadow 
            onClick={handleGroundClick}
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#a8d94e" roughness={0.8} />
          </mesh>

          {/* 부드러운 그림자 효과 */}
          <ContactShadows position={[0, -0.05, 0]} opacity={0.5} scale={40} blur={2} far={10} />
          
          {/* 카메라 컨트롤 */}
          <OrbitControls 
            makeDefault 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2} 
            minDistance={5} 
            maxDistance={150} 
          />
        </Suspense>
      </Canvas>

      {/* 게임 월드 위에 띄워질 UI 오버레이 (2D HTML) */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-4">
        <Link 
          to="/map" 
          className="px-6 py-2 bg-white/90 backdrop-blur-sm text-gray-800 font-bold rounded-full shadow-md hover:bg-white transition-all flex items-center"
        >
          ← 숲(월드맵)으로
        </Link>
        <div className="px-6 py-2 bg-green-600 text-white font-black rounded-full shadow-lg border-2 border-green-400 text-lg">
          {classId === 'class-1' ? '새싹 1반' : classId === 'class-2' ? '햇살 2반' : '푸른 3반'}의 독서 나무
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-4">
        {/* 레벨업 테스트용 버튼 */}
        <button 
          onClick={() => {
            if (treeLevel < 3) setTreeLevel(prev => prev + 1);
          }}
          disabled={treeLevel >= 3}
          className={`px-6 py-2 font-bold rounded-full shadow-md transition-all flex items-center gap-2 ${
            treeLevel >= 3 
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
              : 'bg-green-500 text-white hover:bg-green-600 hover:scale-105'
          }`}
        >
          <span>⬆️</span> 나무 레벨업 (테스트)
        </button>

        <Link 
          to="/student" 
          className="px-6 py-2 bg-blue-500 text-white font-bold rounded-full shadow-md hover:bg-blue-600 transition-all"
        >
          내 대시보드
        </Link>
        <Link 
          to="/write" 
          className="px-6 py-2 bg-amber-500 text-white font-bold rounded-full shadow-md hover:bg-amber-600 transition-all flex items-center gap-2"
        >
          <span>✍️</span> 독서록 쓰기
        </Link>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white px-8 py-3 rounded-full backdrop-blur-sm pointer-events-none text-base font-medium shadow-lg animate-pulse">
        👆 마우스로 땅을 클릭하여 이동하고, 드래그하여 시점을 돌려보세요!
      </div>
    </div>
  );
};

export default GameWorld;
