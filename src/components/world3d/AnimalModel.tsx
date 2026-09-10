import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnimalId } from '../../lib/animals';

const palette: Record<Exclude<AnimalId, 'rabbit'>, string> = { grasshopper: '#84cc16', frog: '#22c55e', snake: '#a3a34a', hawk: '#92400e', fox: '#ea580c' };
export const AnimalModel: React.FC<{ type: Exclude<AnimalId, 'rabbit'>; position: [number, number, number] }> = ({ type, position }) => {
  const ref = useRef<THREE.Group>(null); const color = palette[type];
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + position[0] * .13;
    const speed = type === 'hawk' ? .28 : type === 'snake' ? .18 : .38;
    ref.current.position.x = position[0] + Math.sin(t * speed) * (type === 'hawk' ? 11 : 4);
    ref.current.position.z = position[2] + Math.cos(t * speed * .8) * (type === 'hawk' ? 8 : 3);
    const jump = type === 'grasshopper' ? Math.max(0, Math.sin(t * 3)) * .55 : type === 'frog' ? Math.max(0, Math.sin(t * 2.1)) * .35 : 0;
    ref.current.position.y = type === 'hawk' ? 4 + Math.sin(t * 1.6) * .35 : .22 + jump;
    ref.current.rotation.y = -t * speed;
    ref.current.rotation.z = type === 'hawk' ? Math.sin(t * 5) * .18 : type === 'snake' ? Math.sin(t * 4) * .08 : 0;
  });
  if (type === 'snake') return <group ref={ref} position={position} scale={.34}>
    {[-.6,-.2,.2,.6].map((x,i) => <mesh key={x} position={[x, Math.sin(i)*.12,0]} scale={[1,.65,.65]}><sphereGeometry args={[.3,8,6]} /><meshStandardMaterial color={color} flatShading /></mesh>)}
    <mesh position={[.95,.05,0]}><sphereGeometry args={[.25,8,6]} /><meshStandardMaterial color={color} flatShading /></mesh>
  </group>;
  if (type === 'hawk') return <group ref={ref} position={position} scale={.42}>
    <mesh><sphereGeometry args={[.6,8,6]} /><meshStandardMaterial color={color} flatShading /></mesh>
    {[-1,1].map(side => <mesh key={side} position={[side*.65,0,0]} rotation={[0,0,side*.35]}><coneGeometry args={[.45,1.7,4]} /><meshStandardMaterial color="#d97706" flatShading /></mesh>)}
  </group>;
  const scale = type === 'grasshopper' ? .2 : type === 'frog' ? .34 : .4;
  return <group ref={ref} position={position} scale={scale}>
    <mesh scale={type === 'grasshopper' ? [1.5,.55,.55] : [1,.8,.85]} castShadow><sphereGeometry args={[.65,8,6]} /><meshStandardMaterial color={color} flatShading /></mesh>
    <mesh position={[.45,.35,.25]} scale={[.75,.75,.75]}><sphereGeometry args={[.42,8,6]} /><meshStandardMaterial color={color} flatShading /></mesh>
    {type === 'frog' && [-.22,.22].map(x => <mesh key={x} position={[.42,.67,.45]}><sphereGeometry args={[.12,6,6]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
    {type === 'fox' && [-.24,.24].map(x => <mesh key={x} position={[.45,.95,.18]}><coneGeometry args={[.18,.65,5]} /><meshStandardMaterial color={color} flatShading /></mesh>)}
    {type === 'grasshopper' && [-.35,.35].map(x => <mesh key={x} position={[-.35,-.15,x]} rotation={[0,0,x]}><cylinderGeometry args={[.035,.035,.9,5]} /><meshStandardMaterial color="#4d7c0f" /></mesh>)}
  </group>;
};
