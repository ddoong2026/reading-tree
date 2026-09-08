import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';

interface ItemEffectModelProps {
  position: [number, number, number];
  type: 'water' | 'sun' | 'wind';
}

export const ItemEffectModel: React.FC<ItemEffectModelProps> = ({ position, type }) => {
  const groupRef = useRef<THREE.Group>(null);
  const startY = position[1] + 1;

  useFrame(() => {
    if (groupRef.current) {
      // Float upwards gently
      groupRef.current.position.y += 0.015;
    }
  });

  const getEmoji = () => {
    switch(type) {
      case 'water': return '💧';
      case 'sun': return '☀️';
      case 'wind': return '💨';
      default: return '✨';
    }
  };

  const getColor = () => {
    switch(type) {
      case 'water': return '#60a5fa'; // blue-400
      case 'sun': return '#fbbf24';   // amber-400
      case 'wind': return '#9ca3af';  // gray-400
      default: return '#ffffff';
    }
  };

  return (
    <group position={[position[0], startY, position[2]]} ref={groupRef}>
      <Html center zIndexRange={[100, 0]}>
        <div className="text-4xl animate-bounce" style={{ pointerEvents: 'none' }}>
          {getEmoji()}
        </div>
      </Html>
      <Sparkles count={40} scale={2} size={8} speed={0.5} color={getColor()} opacity={0.9} />
    </group>
  );
};
