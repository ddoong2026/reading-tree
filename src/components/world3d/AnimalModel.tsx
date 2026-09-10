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
    const speed = type === 'snake' ? .18 : .3;
    ref.current.position.x = position[0] + Math.sin(t * speed) * 4;
    ref.current.position.z = position[2] + Math.cos(t * speed * .8) * 3;
    const jump = type === 'grasshopper' ? Math.max(0, Math.sin(t * 3)) * .55 : type === 'frog' ? Math.max(0, Math.sin(t * 2.1)) * .35 : 0;
    ref.current.position.y = .22 + jump;
    ref.current.rotation.y = -t * speed;
    ref.current.rotation.z = type === 'snake' ? Math.sin(t * 4) * .08 : 0;
  });
  if (type === 'snake') return <group ref={ref} position={position} scale={.34}>
    {[-.6,-.2,.2,.6].map((x,i) => <mesh key={x} position={[x, Math.sin(i)*.12,0]} scale={[1,.65,.65]}><sphereGeometry args={[.3,8,6]} /><meshStandardMaterial color={color} flatShading /></mesh>)}
    <mesh position={[.95,.05,0]}><sphereGeometry args={[.25,8,6]} /><meshStandardMaterial color={color} flatShading /></mesh>
  </group>;
  if (type === 'hawk') return <group ref={ref} position={position} scale={.42}>
    <mesh position={[0,.35,0]} scale={[.8,1,.75]}><sphereGeometry args={[.6,10,7]} /><meshStandardMaterial color={color} flatShading /></mesh>
    <mesh position={[0,.9,.25]}><sphereGeometry args={[.38,10,7]} /><meshStandardMaterial color="#fbbf24" flatShading /></mesh>
    {[-.2,.2].map(x => <mesh key={x} position={[x,.98,.55]}><sphereGeometry args={[.06,6,6]} /><meshStandardMaterial color="#1c1917" /></mesh>)}
    {[-.18,.18].map(x => <mesh key={x} position={[x,.02,.12]} rotation={[.2,0,0]}><cylinderGeometry args={[.035,.035,.55,5]} /><meshStandardMaterial color="#d97706" /></mesh>)}
    <mesh position={[0,.84,.63]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.13,.35,5]} /><meshStandardMaterial color="#f97316" /></mesh>
  </group>;
  const scale = type === 'grasshopper' ? .2 : type === 'frog' ? .34 : .4;
  return <group ref={ref} position={position} scale={scale}>
    <mesh scale={type === 'grasshopper' ? [1.5,.55,.55] : [1,.8,.85]} castShadow><sphereGeometry args={[.65,8,6]} /><meshStandardMaterial color={color} flatShading /></mesh>
    <mesh position={[.45,.35,.25]} scale={[.75,.75,.75]}><sphereGeometry args={[.42,8,6]} /><meshStandardMaterial color={color} flatShading /></mesh>
    {[-.11,.11].map(x => <mesh key={x} position={[.56,.48,.58]}><sphereGeometry args={[.055,6,6]} /><meshStandardMaterial color="#1c1917" /></mesh>)}
    {type === 'frog' && [-.22,.22].map(x => <mesh key={x} position={[.42,.67,.45]}><sphereGeometry args={[.12,6,6]} /><meshStandardMaterial color="#f8fafc" /></mesh>)}
    {type === 'fox' && [-.24,.24].map(x => <mesh key={x} position={[.45,.95,.18]}><coneGeometry args={[.18,.65,5]} /><meshStandardMaterial color={color} flatShading /></mesh>)}
    {type === 'fox' && <mesh position={[-.65,.15,-.05]} rotation={[0,0,-.8]}><coneGeometry args={[.25,1.15,6]} /><meshStandardMaterial color="#f59e0b" flatShading /></mesh>}
    {type === 'frog' && [-.45,.45].map(x => <mesh key={x} position={[-.35,-.15,x]} scale={[1,.45,.7]}><sphereGeometry args={[.35,7,6]} /><meshStandardMaterial color="#16a34a" flatShading /></mesh>)}
    {type === 'grasshopper' && [-.35,.35].map(x => <mesh key={x} position={[-.35,-.15,x]} rotation={[0,0,x]}><cylinderGeometry args={[.035,.035,.9,5]} /><meshStandardMaterial color="#4d7c0f" /></mesh>)}
  </group>;
};
