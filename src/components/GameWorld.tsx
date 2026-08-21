import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Sparkles, Instances, Instance } from '@react-three/drei';
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
  const [controlMode, setControlMode] = useState<'click' | 'keyboard'>('click');
  
  // 나무 레벨업 테스트용 상태
  const initialLevel = classId === 'class-3' ? 1 : 3;
  const [treeLevel, setTreeLevel] = useState(initialLevel);

  // 바닥(땅) 클릭 핸들러
  const handleGroundClick = (event: ThreeEvent<PointerEvent>) => {
    if (controlMode === 'keyboard') return; // 키보드 모드일 때는 클릭 이동 무시
    setCharacterTarget(event.point.clone());
  };

  const petsList = React.useMemo(() => {
    const pets: React.ReactNode[] = [];
    const petTypes: Array<string> = ['Meshy_AI_Character_output (1)'];
    
    let count = 1;
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

  const grassData = React.useMemo(() => {
    const data: { position: [number, number, number], scaleY: number }[] = [];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scaleY = 0.5 + Math.random() * 1.5;
      
      data.push({ position: [x, scaleY / 2, z], scaleY });
    }
    return data;
  }, []);

  return (
    <div className="relative w-full h-screen bg-sky-200 overflow-hidden">
      {/* 3D 캔버스 영역 (해상도 타협 및 자동 성능 조절로 초저사양 기기 완벽 최적화) */}
      <Canvas 
        shadows 
        dpr={[0.8, 1]} 
        performance={{ min: 0.5 }} 
        camera={{ position: [0, 8, 18], fov: 45 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight 
            castShadow 
            position={[10, 20, 10]} 
            intensity={1.2} 
            shadow-mapSize={[512, 512]} 
          />
          
          <color attach="background" args={['#87CEEB']} />
          <SimpleCloud position={[-15, 20, -25]} scale={2} />
          <SimpleCloud position={[20, 25, -30]} scale={3} />

          {/* 에셋 렌더링 */}
          <CharacterModel targetPosition={characterTarget} controlMode={controlMode} />
          
          {petsList}
          
          <Instances limit={50} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[0.2, 1, 0.2]} />
            <meshStandardMaterial color="#66b032" />
            {grassData.map((data, i) => (
              <Instance key={i} position={data.position} scale={[1, data.scaleY, 1]} />
            ))}
          </Instances>

          <TreeModel position={[0, 0, 0]} level={treeLevel} />

          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, 0, 0]} 
            receiveShadow 
            onClick={handleGroundClick}
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#a8d94e" roughness={0.8} />
          </mesh>

          <ContactShadows position={[0, -0.05, 0]} opacity={0.5} scale={40} blur={1} far={10} resolution={128} />
          
          {/* 키보드 모드일 때는 마우스 회전(OrbitControls)을 끄고 카메라를 고정시킵니다 */}
          <OrbitControls 
            makeDefault 
            enabled={controlMode === 'click'}
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2} 
            minDistance={5} 
            maxDistance={150} 
          />
        </Suspense>
      </Canvas>

      {/* 게임 월드 위에 띄워질 UI 오버레이 (2D HTML) */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-4">
        <div className="flex items-center gap-4">
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
        
        {/* 조작 모드 전환 버튼 */}
        <button
          onClick={() => setControlMode(prev => prev === 'click' ? 'keyboard' : 'click')}
          className="px-6 py-3 w-fit bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl shadow-lg border-2 border-indigo-300 transition-all flex items-center gap-2"
        >
          {controlMode === 'click' ? '🎮 1인칭(키보드) 모드로 변경' : '🖱️ 3인칭(마우스) 모드로 변경'}
        </button>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-4">
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

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white px-8 py-3 rounded-full backdrop-blur-sm pointer-events-none text-base font-medium shadow-lg animate-pulse whitespace-nowrap">
        {controlMode === 'click' 
          ? '👆 마우스로 땅을 클릭하여 이동하고, 드래그하여 시점을 돌려보세요!'
          : '⌨️ W,A,S,D(이동) / Shift(달리기) / Space(점프)'}
      </div>
    </div>
  );
};

export default GameWorld;
