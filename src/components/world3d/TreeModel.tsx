import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

// --- 레벨업 파티클 이펙트 컴포넌트 ---
const LevelUpEffect = ({ active }: { active: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const [particles, setParticles] = useState<{id: number, angle: number, speed: number, color: string, yVelocity: number}[]>([]);
  
  useEffect(() => {
    if (active) {
      // 펑 터질 때 사방으로 퍼지는 알록달록한 구슬 입자들
      const colors = ['#fef08a', '#fde047', '#fbbf24', '#f59e0b', '#a3e635', '#4ade80', '#60a5fa', '#f472b6'];
      const newParticles = Array.from({ length: 25 }).map((_, i) => ({
        id: i,
        angle: Math.random() * Math.PI * 2,
        speed: 15 + Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        yVelocity: 15 + Math.random() * 25
      }));
      setParticles(newParticles);
      
      if (ringRef.current) ringRef.current.scale.setScalar(1);
      if (ringMatRef.current) ringMatRef.current.opacity = 0.8;
    } else {
      setParticles([]);
    }
  }, [active]);

  useFrame((_, delta) => {
    if (active) {
      // 고리(Ring) 팽창 및 페이드아웃 효과
      if (ringRef.current && ringMatRef.current) {
        ringRef.current.scale.addScalar(delta * 25);
        ringMatRef.current.opacity = Math.max(0, ringMatRef.current.opacity - delta * 1.5);
      }
      
      // 입자 물리 엔진 (포물선 운동)
      if (group.current) {
        group.current.children.forEach((child, i) => {
          if (i > 0) { // 0번 인덱스는 고리(Ring)이므로 건너뜀
            const p = particles[i - 1];
            if (p) {
              child.position.x += Math.cos(p.angle) * p.speed * delta;
              child.position.z += Math.sin(p.angle) * p.speed * delta;
              child.position.y += p.yVelocity * delta;
              p.yVelocity -= 40 * delta; // 중력
              child.scale.multiplyScalar(0.92); // 서서히 작아짐
            }
          }
        });
      }
    }
  });

  if (!active) return null;

  return (
    <group ref={group} position={[0, 4, 0]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.3, 16, 64]} />
        <meshBasicMaterial ref={ringMatRef} color="#fbbf24" transparent opacity={0.8} />
      </mesh>
      {particles.map(p => (
        <mesh key={p.id}>
          <sphereGeometry args={[0.6]} />
          <meshBasicMaterial color={p.color} />
        </mesh>
      ))}
    </group>
  );
};

interface TreeModelProps {
  position?: [number, number, number];
  scale?: number;
  level?: number;
  disableMenu?: boolean;
}

export const TreeModel: React.FC<TreeModelProps> = ({ position = [0, 0, 0], scale = 25, level, disableMenu = false }) => {
  // tree4.glb 파일을 로드합니다.
  const { scene } = useGLTF('/tree4.glb');
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    // Y축 기준점을 모델의 맨 아래(바닥)로 맞추기 위한 자동 피봇 보정
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const bottomY = center.y - size.y / 2;
    clone.position.y = -bottomY; // 바닥이 0이 되도록 끌어올림
    return clone;
  }, [scene]);

  // 레벨에 따른 목표 크기 (Lv1: 5 (사람 키), Lv2: 12, Lv3: 22)
  const getTargetScale = (lvl?: number) => {
    if (!lvl) return scale;
    if (lvl === 1) return 5;
    if (lvl === 2) return 12;
    return 22;
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const treeGroup = useRef<THREE.Group>(null);
  
  // --- 애니메이션 상태 관리 ---
  const [animState, setAnimState] = useState<'idle' | 'jiggle' | 'pop'>('idle');
  const [showEffect, setShowEffect] = useState(false);
  
  const targetScale = useRef(getTargetScale(level));
  const startScale = useRef(targetScale.current);
  const prevLevel = useRef(level || 3);
  const animTimer = useRef(0);

  // 레벨 변경 감지 및 애니메이션 트리거
  useEffect(() => {
    if (level && level > prevLevel.current) {
      // 레벨 업!
      startScale.current = treeGroup.current ? treeGroup.current.scale.y : getTargetScale(prevLevel.current);
      targetScale.current = getTargetScale(level);
      setAnimState('jiggle');
      animTimer.current = 0;
      setShowEffect(false);
      prevLevel.current = level;
    } else if (level && level < prevLevel.current) {
      // 디버그용 다운그레이드 (애니메이션 없이 즉각 축소)
      targetScale.current = getTargetScale(level);
      if (treeGroup.current) treeGroup.current.scale.setScalar(targetScale.current);
      prevLevel.current = level;
    }
  }, [level]);

  // 탄성 이징 함수 (뽀용!)
  const easeOutElastic = (x: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
  };

  useFrame((_, delta) => {
    if (!treeGroup.current) return;

    if (animState === 'jiggle') {
      animTimer.current += delta;
      // 움찔움찔 (좌우로 떨리고 위아래로 압축)
      const freq = 50;
      const intensity = 0.08;
      const sx = startScale.current * (1 + Math.sin(animTimer.current * freq) * intensity);
      const sy = startScale.current * (1 - Math.sin(animTimer.current * freq) * intensity * 0.5); // 눌림
      const sz = startScale.current * (1 + Math.cos(animTimer.current * freq) * intensity);
      
      treeGroup.current.scale.set(sx, Math.max(0.1, sy), sz);

      if (animTimer.current > 1.0) { // 1초간 뜸들이기
        setAnimState('pop');
        animTimer.current = 0;
        setShowEffect(true); // 팡 터지는 이펙트 시작!
      }
    } else if (animState === 'pop') {
      animTimer.current += delta;
      const duration = 1.2; // 1.2초간 뽀용
      let progress = animTimer.current / duration;
      if (progress > 1) progress = 1;

      const eased = easeOutElastic(progress);
      const currentS = startScale.current + (targetScale.current - startScale.current) * eased;
      
      treeGroup.current.scale.setScalar(currentS);

      if (progress === 1) {
        setAnimState('idle');
      }
    } else {
      // idle 상태: 초기에 부드럽게 목표 스케일로 스며듦
      treeGroup.current.scale.lerp(new THREE.Vector3(targetScale.current, targetScale.current, targetScale.current), 0.1);
    }
  });

  const handleTreeClick = (e: ThreeEvent<MouseEvent>) => {
    if (disableMenu) return; // 비활성화 상태면 이벤트를 막지 않고 부모(부유섬)로 통과시킴
    e.stopPropagation(); // 클릭 이벤트가 땅(바닥)으로 전달되지 않게 차단
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <group position={position}>
      <LevelUpEffect active={showEffect} />
      
      {/* 뿌리가 살짝 땅에 박히도록 약간 아래로 내림 */}
      <group ref={treeGroup} position={[0, -0.5, 0]}>
        <primitive 
          object={clonedScene} 
          castShadow 
          receiveShadow 
          onClick={handleTreeClick}
        />
      </group>
      
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
