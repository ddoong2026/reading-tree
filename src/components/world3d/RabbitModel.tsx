import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const RabbitModel: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2.5) * 0.04;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.25;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={0.45}>
      <mesh position={[0, 0.45, 0]} castShadow><sphereGeometry args={[0.55, 8, 6]} /><meshStandardMaterial color="#f7efe2" flatShading /></mesh>
      <mesh position={[0, 0.95, 0.05]} castShadow><sphereGeometry args={[0.42, 8, 6]} /><meshStandardMaterial color="#fff8eb" flatShading /></mesh>
      {[-0.18, 0.18].map((x) => <React.Fragment key={x}><mesh position={[x, 1.45, 0.05]} rotation={[0, 0, x * -0.35]} castShadow><coneGeometry args={[0.12, 0.62, 5]} /><meshStandardMaterial color="#f7efe2" flatShading /></mesh><mesh position={[x, 1.43, 0.06]} rotation={[0, 0, x * -0.35]}><coneGeometry args={[0.055, 0.46, 5]} /><meshStandardMaterial color="#f9a8a8" flatShading /></mesh></React.Fragment>)}
      {[-0.16, 0.16].map((x) => <mesh key={x} position={[x, 1.04, 0.4]}><sphereGeometry args={[0.055, 6, 6]} /><meshStandardMaterial color="#3f2d22" /></mesh>)}
      <mesh position={[0, 0.87, 0.42]}><sphereGeometry args={[0.06, 6, 6]} /><meshStandardMaterial color="#f58b8b" /></mesh>
      <mesh position={[0, 0.44, -0.48]} castShadow><sphereGeometry args={[0.18, 7, 6]} /><meshStandardMaterial color="#ffffff" flatShading /></mesh>
    </group>
  );
};
