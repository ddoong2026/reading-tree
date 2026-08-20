import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Html, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import { TreeModel } from '../components/world3d/TreeModel';

// --- 카메라 애니메이션 (줌인 & 전환) ---
const CameraRig: React.FC<{ targetIsland: THREE.Vector3 | null, onReached: () => void }> = ({ targetIsland, onReached }) => {
  useFrame((state) => {
    if (targetIsland) {
      // 목표 시점: 해당 섬의 중앙 나무를 향해 구름 속으로 파고드는 느낌
      const targetCamPos = new THREE.Vector3(targetIsland.x, targetIsland.y + 1, targetIsland.z + 4);
      
      // 카메라 위치를 목표 지점으로 고속 이동 (Lerp)
      state.camera.position.lerp(targetCamPos, 0.05);
      
      // 카메라는 계속해서 섬의 중심(조금 윗부분)을 바라봄
      const targetLookAt = new THREE.Vector3(targetIsland.x, targetIsland.y + 1, targetIsland.z);
      // 기존 lookAt을 보간하기 위해 쿼터니언 사용
      const currentQuat = state.camera.quaternion.clone();
      state.camera.lookAt(targetLookAt);
      const targetQuat = state.camera.quaternion.clone();
      state.camera.quaternion.copy(currentQuat).slerp(targetQuat, 0.1);

      // 목표 지점에 거의 도달하면 콜백(페이지 이동) 실행
      if (state.camera.position.distanceTo(targetCamPos) < 0.5) {
        onReached();
      }
    }
  });
  return null;
};

// --- 부유섬 컴포넌트 ---
interface FloatingIslandProps {
  position: [number, number, number];
  cls: any;
  onClick: (cls: any, pos: THREE.Vector3) => void;
  hovered: string | null;
  setHovered: (id: string | null) => void;
}

const FloatingIsland: React.FC<FloatingIslandProps> = ({ position, cls, onClick, hovered, setHovered }) => {
  const isHovered = hovered === cls.id;
  const islandScale = isHovered ? 1.05 : 1;
  const treeScale = cls.treeLevel * 0.3 + 0.5; // 레벨 1 = 0.8, 레벨 3 = 1.4
  const groupRef = useRef<THREE.Group>(null);

  return (
    <Float speed={isHovered ? 3 : 1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group 
        ref={groupRef}
        position={position} 
        scale={islandScale}
        onClick={(e) => {
          e.stopPropagation();
          if (groupRef.current) {
            const worldPos = new THREE.Vector3();
            groupRef.current.getWorldPosition(worldPos);
            onClick(cls, worldPos);
          }
        }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(cls.id); }}
        onPointerOut={() => setHovered(null)}
      >
        {/* 섬 바닥 (흙) */}
        <mesh position={[0, -1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[3.8, 1.5, 2, 8]} />
          <meshStandardMaterial color="#8B4513" roughness={0.9} />
        </mesh>
        
        {/* 섬 윗부분 (잔디) */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[4.2, 3.8, 0.5, 8]} />
          <meshStandardMaterial color="#4CAF50" roughness={0.8} />
        </mesh>
        
        {/* 고퀄리티 구름 장식 (섬 베이스 주위) */}
        <group position={[0, -1.5, 0]}>
          <Cloud opacity={0.8} speed={0.4} scale={2} color="#ffffff" />
        </group>

        {/* 나무 (레벨에 따른 크기) */}
        <group position={[0, 0.25, 0]} scale={treeScale}>
          <TreeModel disableMenu={true} />
        </group>

        {/* 반 이름 라벨 (HTML) */}
        <Html position={[0, treeScale * 3.5 + 1.5, 0]} center zIndexRange={[100, 0]}>
          <div 
            className={`transition-all duration-300 pointer-events-none whitespace-nowrap ${isHovered ? 'scale-110' : 'scale-100'}`}
          >
            <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border-2 border-sky-200 text-center">
              <h3 className="text-2xl font-bold text-gray-800">{cls.name} 나무</h3>
              <p className="text-lg text-sky-600 font-bold mt-1">Lv. {cls.treeLevel}</p>
            </div>
            {isHovered && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-sky-500 text-white px-4 py-1 rounded-full font-bold shadow-md animate-bounce">
                클릭해서 입장!
              </div>
            )}
          </div>
        </Html>
      </group>
    </Float>
  );
};

// --- 메인 월드맵 씬 ---
const WorldMap: React.FC = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);
  const [targetIsland, setTargetIsland] = useState<THREE.Vector3 | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // 모의 반 데이터
  const classes = [
    { id: 'class-1', name: '새싹 1반', treeLevel: 3, position: [0, 0, 10] as [number, number, number] },
    { id: 'class-2', name: '햇살 2반', treeLevel: 2, position: [-35, 8, -25] as [number, number, number] },
    { id: 'class-3', name: '푸른 3반', treeLevel: 1, position: [35, -6, -20] as [number, number, number] },
  ];

  // 커서 스타일 변경
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  const handleIslandClick = (cls: any, pos: THREE.Vector3) => {
    if (targetIsland) return; // 이미 전환 중이면 무시
    setSelectedClassId(cls.id);
    setTargetIsland(pos);
  };

  const handleAnimationComplete = () => {
    if (selectedClassId) {
      // 트랜지션용 흰 화면 효과 후 이동
      document.body.style.cursor = 'auto';
      navigate(`/world/${selectedClassId}`);
    }
  };

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-sky-300 to-sky-100 overflow-hidden">
      
      {/* 3D 캔버스 배경 */}
      <Canvas 
        shadows 
        camera={{ position: [0, 50, 80], fov: 45 }}
      >
        <Suspense fallback={null}>
          <Environment preset="city" />
          
          <ambientLight intensity={0.6} />
          <directionalLight 
            position={[10, 20, 10]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize-width={1024} 
            shadow-mapSize-height={1024} 
          />

          {classes.map((cls) => (
            <FloatingIsland 
              key={cls.id}
              position={cls.position}
              cls={cls}
              hovered={hovered}
              setHovered={setHovered}
              onClick={handleIslandClick}
            />
          ))}

          {/* 배경을 장식하는 대형 고퀄리티 구름들 */}
          <Float speed={1} floatIntensity={2}>
            <Cloud position={[-30, -15, -30]} opacity={0.5} speed={0.2} scale={8} color="#f0f8ff" />
            <Cloud position={[30, -20, -15]} opacity={0.5} speed={0.2} scale={10} color="#f0f8ff" />
            <Cloud position={[0, -25, 20]} opacity={0.5} speed={0.2} scale={8} color="#f0f8ff" />
          </Float>

          {/* 카메라 무빙 (트랜지션) */}
          <CameraRig targetIsland={targetIsland} onReached={handleAnimationComplete} />
          
          {/* 타겟 섬이 선택되지 않았을 때만 화면 회전(OrbitControls) 활성화 */}
          {!targetIsland && (
            <OrbitControls 
              makeDefault 
              minPolarAngle={Math.PI / 6} 
              maxPolarAngle={Math.PI / 2.5} 
              minDistance={20} 
              maxDistance={150} 
            />
          )}
        </Suspense>
      </Canvas>

      {/* HTML UI 오버레이 (화면 전면) */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          targetIsland ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <header className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-5xl font-black text-sky-900 drop-shadow-[0_4px_4px_rgba(255,255,255,0.8)] tracking-wide mb-4">
              🌲 독서오름나무 숲
            </h1>
            <p className="text-2xl text-sky-800 bg-white/70 inline-block px-6 py-2 rounded-full backdrop-blur-md shadow-sm font-bold border border-white/60">
              방문하고 싶은 반의 둥둥섬을 선택하세요! ✨
            </p>
          </div>
          <Link 
            to="/" 
            className="text-sky-800 font-bold hover:text-white hover:bg-sky-500 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 text-xl border border-sky-100"
          >
            🏠 메인으로
          </Link>
        </header>
      </div>

      {/* 줌인 시 페이드아웃(하얀 구름 속으로 들어가는) 효과 */}
      <div 
        className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-700 ease-in ${
          targetIsland ? 'opacity-100 delay-500' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export default WorldMap;
