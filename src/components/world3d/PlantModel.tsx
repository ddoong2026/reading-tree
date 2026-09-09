import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder, Box } from '@react-three/drei';
import * as THREE from 'three';

interface PlantModelProps {
  position?: [number, number, number];
  growth: number;
  usedWater?: number;
  usedSun?: number;
  usedWind?: number;
  isFlower: boolean;
  seedLevel?: number;
}

// 꽃잎 색은 씨앗 레벨이 아니라, 꽃에 사용한 아이템의 비율로 결정한다.
// 물은 파랑, 햇빛은 노랑, 바람은 보라 계열이며 여러 아이템을 사용하면
// 각 색을 사용 횟수만큼 섞어 자연스럽게 중간색을 만든다.
const getPetalColor = (usedWater: number, usedSun: number, usedWind: number, seedLevel: number) => {
  const uses = [usedWater, usedSun, usedWind].map((count) => Math.max(0, count));
  const totalUses = uses.reduce((total, count) => total + count, 0);
  const careColors = ['#38bdf8', '#fbbf24', '#a78bfa'];

  // 기존 데이터처럼 사용 이력이 없는 꽃도 이전의 씨앗 색을 유지한다.
  if (totalUses === 0) {
    const seedColors = ['#f472b6', '#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];
    return seedColors[(seedLevel - 1) % seedColors.length];
  }

  const mixedColor = uses.reduce((color, count, index) => {
    const itemColor = new THREE.Color(careColors[index]);
    color.r += itemColor.r * count;
    color.g += itemColor.g * count;
    color.b += itemColor.b * count;
    return color;
  }, new THREE.Color(0, 0, 0));

  mixedColor.multiplyScalar(1 / totalUses);
  return `#${mixedColor.getHexString()}`;
};

export const PlantModel: React.FC<PlantModelProps> = ({ 
  position = [0, 0, 0], 
  growth, 
  usedWater = 0,
  usedSun = 0,
  usedWind = 0,
  isFlower,
  seedLevel = 1
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle swaying animation
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }
  });

  // A seed blooms after `seedLevel + 1` item uses in total.
  
  let stage = 0;
  const requiredUses = Math.max(2, seedLevel + 1);
  const isItemFlower = usedWater + usedSun + usedWind >= requiredUses;
  const totalRequiredGrowth = 1 + requiredUses;

  if (isItemFlower || isFlower) {
    stage = 4;
  } else if (growth >= 1 + requiredUses * 2) {
    stage = 3;
  } else if (growth >= 1 + requiredUses) {
    stage = 2;
  } else if (growth >= 1) {
    stage = 1;
  }

  // 부드러운 성장을 위한 스케일 계산 (최소 0.6에서 1.2까지)
  const baseScale = (stage === 4 ? 1.2 : 0.6 + (Math.min(growth, totalRequiredGrowth) / totalRequiredGrowth) * 0.6) * (1 + (seedLevel - 1) * 0.2);

  const petalColor = getPetalColor(usedWater, usedSun, usedWind, seedLevel);

  return (
    <group position={position} ref={groupRef} scale={[baseScale, baseScale, baseScale]}>
      {/* Dirt Mound */}
      <Sphere args={[0.6, 16, 16]} position={[0, -0.2, 0]} scale={[1, 0.4, 1]}>
        <meshStandardMaterial color="#5c4033" roughness={1} />
      </Sphere>

      {/* Stage 0: Seed */}
      {stage === 0 && (
        <Sphere args={[0.2, 16, 16]} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#8b4513" />
        </Sphere>
      )}

      {/* Stage 1: Sprout */}
      {stage >= 1 && (
        <>
          {/* Main Stem */}
          <Cylinder args={[0.05, 0.05, stage === 1 ? 0.5 : stage === 2 ? 1 : 1.5]} position={[0, stage === 1 ? 0.25 : stage === 2 ? 0.5 : 0.75, 0]}>
            <meshStandardMaterial color="#4ade80" />
          </Cylinder>
          
          {/* Leaves */}
          <group position={[0, stage === 1 ? 0.2 : 0.4, 0]}>
            <Box args={[0.3, 0.05, 0.15]} position={[0.2, 0.1, 0]} rotation={[0, 0, Math.PI / 6]}>
              <meshStandardMaterial color="#22c55e" />
            </Box>
            <Box args={[0.3, 0.05, 0.15]} position={[-0.2, 0.1, 0]} rotation={[0, 0, -Math.PI / 6]}>
              <meshStandardMaterial color="#22c55e" />
            </Box>
          </group>
        </>
      )}

      {/* Stage 2 & up: More leaves */}
      {stage >= 2 && (
        <group position={[0, 0.8, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Box args={[0.4, 0.05, 0.2]} position={[0.2, 0.1, 0]} rotation={[0, 0, Math.PI / 8]}>
            <meshStandardMaterial color="#16a34a" />
          </Box>
          <Box args={[0.4, 0.05, 0.2]} position={[-0.2, 0.1, 0]} rotation={[0, 0, -Math.PI / 8]}>
            <meshStandardMaterial color="#16a34a" />
          </Box>
        </group>
      )}

      {/* Stage 3: Bud */}
      {stage === 3 && (
        <Sphere args={[0.25, 16, 16]} position={[0, 1.6, 0]}>
          <meshStandardMaterial color="#fcd34d" />
        </Sphere>
      )}

      {/* Stage 4: Fully Bloomed Flower */}
      {stage === 4 && (
        <group position={[0, 1.6, 0]}>
          {/* Center */}
          <Sphere args={[0.3, 16, 16]}>
            <meshStandardMaterial color="#fbbf24" />
          </Sphere>
          {/* Petals */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <Sphere 
                key={i} 
                args={[0.2, 16, 16]} 
                position={[Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0]}
                scale={[1, 1, 0.2]}
              >
                <meshStandardMaterial color={petalColor} />
              </Sphere>
            );
          })}
        </group>
      )}
    </group>
  );
};
