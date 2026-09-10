import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnimalId } from '../../lib/animals';

const styles: Record<Exclude<AnimalId, 'rabbit'>, { color: string; scale: number; ears?: boolean; wings?: boolean }> = {
  grasshopper: { color: '#84cc16', scale: 0.22 }, frog: { color: '#22c55e', scale: 0.32 },
  snake: { color: '#a3a34a', scale: 0.3 }, hawk: { color: '#a16207', scale: 0.4, wings: true }, fox: { color: '#f97316', scale: 0.38, ears: true },
};
export const AnimalModel: React.FC<{ type: Exclude<AnimalId, 'rabbit'>; position: [number, number, number] }> = ({ type, position }) => {
  const ref = useRef<THREE.Group>(null); const style = styles[type];
  useFrame((state) => { if (ref.current) { const p = state.clock.elapsedTime * 2 + position[0]; ref.current.position.y = position[1] + Math.max(0, Math.sin(p)) * 0.16; ref.current.rotation.y = Math.sin(p * .35) * .5; } });
  return <group ref={ref} position={position} scale={style.scale}>
    <mesh castShadow><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={style.color} flatShading /></mesh>
    <mesh position={[0, .72, .35]} scale={[.7,.7,.7]}><sphereGeometry args={[.7,8,6]} /><meshStandardMaterial color={style.color} flatShading /></mesh>
    {style.ears && [-.32,.32].map(x => <mesh key={x} position={[x,1.3,.25]}><coneGeometry args={[.18,.7,5]} /><meshStandardMaterial color={style.color} flatShading /></mesh>)}
    {style.wings && [-1,1].map(x => <mesh key={x} position={[x*.8,.25,0]} rotation={[0,0,x*.7]}><coneGeometry args={[.5,1.5,4]} /><meshStandardMaterial color="#fbbf24" flatShading /></mesh>)}
  </group>;
};
