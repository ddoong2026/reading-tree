import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

interface PetModelProps {
  type: 'dog' | 'pig' | 'sheep';
  initialPosition: [number, number, number];
}

export const PetModel: React.FC<PetModelProps> = ({ type, initialPosition }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(`/${type}.glb`);
  const { actions } = useAnimations(animations, group);
  
  const [position, setPosition] = useState<[number, number, number]>(initialPosition);
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const speed = 2.0;

  // 정상적인 뼈대(애니메이션) 복제
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  useEffect(() => {
    const actionKeys = Object.keys(actions);
    const walkAction = actions['Walk'] || actions['walk'] || actions['Walking'] || actions['Run'] || actions[actionKeys[1]];
    const idleAction = actions['Idle'] || actions['idle'] || actions['Alert'] || actions[actionKeys[0]];

    if (!walkAction || !idleAction || walkAction === idleAction) {
      if (actionKeys.length > 0) actions[actionKeys[0]]?.play();
      return;
    }

    if (isMoving) {
      idleAction.fadeOut(0.2);
      walkAction.reset().fadeIn(0.2).play();
    } else {
      walkAction.fadeOut(0.2);
      idleAction.reset().fadeIn(0.2).play();
    }
  }, [isMoving, actions]);

  // 로밍 로직
  useEffect(() => {
    const roamInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setTargetPos(null);
        setIsMoving(false);
        return;
      }
      
      const angle = Math.random() * Math.PI * 2;
      const radius = 12 + Math.random() * 20;
      const newX = Math.cos(angle) * radius;
      const newZ = Math.sin(angle) * radius;
      
      setTargetPos(new THREE.Vector3(newX, 0, newZ));
      setIsMoving(true);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(roamInterval);
  }, [type]);

  useFrame((state, delta) => {
    if (!group.current || !targetPos) return;

    const currentPos = group.current.position;
    const distance = currentPos.distanceTo(targetPos);

    if (distance > 0.1) {
      const direction = targetPos.clone().sub(currentPos).normalize();
      const targetAngle = Math.atan2(direction.x, direction.z);
      
      const currentRotation = group.current.rotation.y;
      const diff = targetAngle - currentRotation;
      
      let normalizedDiff = diff;
      while (normalizedDiff <= -Math.PI) normalizedDiff += Math.PI * 2;
      while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
      
      group.current.rotation.y += normalizedDiff * 5 * delta;
      currentPos.add(direction.multiplyScalar(speed * delta));
      setPosition([currentPos.x, currentPos.y, currentPos.z]);
    } else {
      setIsMoving(false);
      setTargetPos(null);
    }
  });

  return (
    <group ref={group} position={initialPosition} dispose={null}>
      <primitive object={clonedScene} scale={1.2} castShadow />
    </group>
  );
};


// 모든 펫 에셋 프리로드
useGLTF.preload('/dog.glb');
useGLTF.preload('/pig.glb');
useGLTF.preload('/sheep.glb');
useGLTF.preload('/egg.glb');
