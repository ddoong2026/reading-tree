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

  // A seed blooms after using each item `seedLevel` times.
  
  let stage = 0;
  const requiredUses = Math.max(1, seedLevel);
  const isItemFlower = usedWater >= requiredUses && usedSun >= requiredUses && usedWind >= requiredUses;
  const totalRequiredGrowth = 1 + requiredUses * 3;

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

  // 시드 레벨별 색상 지정
  const petalColors = ["#f472b6", "#c084fc", "#60a5fa", "#34d399", "#fbbf24", "#f87171"];
  const petalColor = petalColors[(seedLevel - 1) % petalColors.length];

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
