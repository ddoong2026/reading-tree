import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

interface PetModelProps {
  type: string;
  initialPosition: [number, number, number];
}

export const PetModel: React.FC<PetModelProps> = ({ type, initialPosition }) => {
  const group = useRef<THREE.Group>(null);
  const innerGroup = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(`/${type}.glb`);
  const { actions } = useAnimations(animations, group);
  
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const speed = 2.0;

  // 정상적인 뼈대(애니메이션) 복제
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  useEffect(() => {
    const actionKeys = Object.keys(actions);
    console.log(`[${type}] 파일에 포함된 애니메이션 목록:`, actionKeys);

    let walkAction = actions['Walk'] || actions['walk'] || actions['Walking'] || actions['Run'];
    let idleAction = actions['Idle'] || actions['idle'] || actions['Alert'];

    // 파일 내에 애니메이션이 1개라도 있다면 그것을 기본값으로 강제 사용
    if (actionKeys.length > 0) {
      if (!walkAction) walkAction = actions[actionKeys[0]];
      if (!idleAction) idleAction = actions[actionKeys[0]];
    }

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
  }, [isMoving, actions, type]);

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

  useFrame((_state, delta) => {
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
    } else {
      setIsMoving(false);
      setTargetPos(null);
    }

    // [절차적 애니메이션] 모델에 내장된 애니메이션이 없을 때, 코드로 직접 걷는 모션(뒤뚱거림)을 만듭니다.
    if (innerGroup.current) {
      if (isMoving) {
        // 통통 튀는 모션 (Y축 이동)
        const bounce = Math.abs(Math.sin(_state.clock.elapsedTime * 15)) * 0.2;
        // 좌우로 갸우뚱거리는 모션 (Z축 회전)
        const wobble = Math.sin(_state.clock.elapsedTime * 7.5) * 0.15;
        
        innerGroup.current.position.y = bounce;
        innerGroup.current.rotation.z = wobble;
      } else {
        // 멈췄을 때는 부드럽게 원래 자세로 복귀
        innerGroup.current.position.y = THREE.MathUtils.lerp(innerGroup.current.position.y, 0, 0.1);
        innerGroup.current.rotation.z = THREE.MathUtils.lerp(innerGroup.current.rotation.z, 0, 0.1);
      }
    }
  });

  return (
    <group ref={group} position={initialPosition} dispose={null}>
      <group ref={innerGroup}>
        {/* Meshy AI 모델은 기준점이 발밑에 정상적으로 잡혀 있으므로 Y축 오프셋을 0으로 복구합니다. */}
        <primitive object={clonedScene} scale={0.4} position={[0, 0, 0]} castShadow />
      </group>
    </group>
  );
};


// 모든 펫 에셋 프리로드
useGLTF.preload('/dog.glb');
useGLTF.preload('/pig.glb');
useGLTF.preload('/sheep.glb');
useGLTF.preload('/egg.glb');
