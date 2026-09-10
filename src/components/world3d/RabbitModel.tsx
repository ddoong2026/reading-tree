import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const cream = '#f7efe2';
const warmWhite = '#fff9ee';

export const RabbitModel: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    // 각 토끼가 식물 주변의 작은 타원 궤도를 따라 폴짝폴짝 이동한다.
    // 위치로부터 위상을 정해 같은 자리에 있는 토끼들도 동시에 움직이지 않는다.
    const phase = state.clock.elapsedTime * 2.8 + position[0] * 1.7 + position[2] * 0.9;
    const pathPhase = phase * 0.42;
    const hop = Math.max(0, Math.sin(phase));
    groupRef.current.position.x = position[0] + Math.cos(pathPhase) * 0.38;
    groupRef.current.position.z = position[2] + Math.sin(pathPhase) * 0.28;
    groupRef.current.position.y = position[1] + hop * 0.28;
    groupRef.current.rotation.y = -pathPhase;
    groupRef.current.rotation.z = Math.sin(phase) * -0.08;
  });

  return (
    <group ref={groupRef} position={position} scale={0.48}>
      <mesh position={[0, 0.48, -0.03]} scale={[0.82, 1, 0.72]} castShadow>
        <sphereGeometry args={[0.55, 10, 7]} /><meshStandardMaterial color={cream} flatShading roughness={0.82} />
      </mesh>
      {[-0.34, 0.34].map((x) => <mesh key={x} position={[x, 0.33, -0.13]} scale={[0.62, 0.7, 0.72]} castShadow>
        <sphereGeometry args={[0.36, 8, 6]} /><meshStandardMaterial color={cream} flatShading roughness={0.82} />
      </mesh>)}

      <mesh position={[0, 1.08, 0.1]} scale={[1.05, 0.94, 0.92]} castShadow>
        <sphereGeometry args={[0.48, 10, 8]} /><meshStandardMaterial color={warmWhite} flatShading roughness={0.75} />
      </mesh>
      {[-0.23, 0.23].map((x) => <mesh key={x} position={[x, 0.93, 0.46]} scale={[1.05, 0.76, 0.48]}>
        <sphereGeometry args={[0.18, 8, 6]} /><meshStandardMaterial color="#fffdf7" flatShading />
      </mesh>)}

      {[-0.2, 0.2].map((x) => <group key={x} position={[x, 1.57, 0.03]} rotation={[0, 0, x * -0.55]}>
        <mesh scale={[0.5, 1.55, 0.36]} castShadow><sphereGeometry args={[0.22, 8, 6]} /><meshStandardMaterial color={cream} flatShading roughness={0.8} /></mesh>
        <mesh position={[0, 0.01, 0.08]} scale={[0.28, 1.2, 0.18]}><sphereGeometry args={[0.2, 8, 6]} /><meshStandardMaterial color="#f6a4a4" flatShading /></mesh>
      </group>)}

      {[-0.18, 0.18].map((x) => <group key={x} position={[x, 1.15, 0.48]}>
        <mesh scale={[1, 1.1, 0.45]}><sphereGeometry args={[0.105, 8, 8]} /><meshStandardMaterial color="#34261e" /></mesh>
        <mesh position={[x < 0 ? -0.025 : 0.025, 0.028, 0.043]}><sphereGeometry args={[0.028, 6, 6]} /><meshStandardMaterial color="#ffffff" /></mesh>
      </group>)}
      <mesh position={[0, 0.98, 0.58]} scale={[1.15, 0.8, 0.65]}><sphereGeometry args={[0.065, 6, 5]} /><meshStandardMaterial color="#ee8c96" flatShading /></mesh>

      {[-0.2, 0.2].map((x) => <mesh key={x} position={[x, 0.11, 0.37]} scale={[1, 0.55, 1.2]} castShadow>
        <sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color="#fffaf0" flatShading />
      </mesh>)}
      <mesh position={[0, 0.57, -0.48]} castShadow><sphereGeometry args={[0.18, 8, 6]} /><meshStandardMaterial color="#ffffff" flatShading /></mesh>

      <mesh position={[0, 0.77, 0.37]} rotation={[0.25, 0, 0]}><torusGeometry args={[0.29, 0.028, 6, 12, Math.PI]} /><meshStandardMaterial color="#4d8d31" flatShading /></mesh>
      {[-0.13, 0, 0.13].map((x) => <mesh key={x} position={[x, 0.7, 0.43]} rotation={[0.5, 0, -x * 2]} scale={[0.7, 1, 0.45]}>
        <coneGeometry args={[0.09, 0.25, 5]} /><meshStandardMaterial color="#76ad3c" flatShading />
      </mesh>)}
    </group>
  );
};
