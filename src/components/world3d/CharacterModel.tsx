import React, { useEffect, useRef, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CharacterModelProps {
  targetPosition: THREE.Vector3 | null;
}

export const CharacterModel: React.FC<CharacterModelProps> = ({ targetPosition }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/charactor.glb');
  const { actions } = useAnimations(animations, group);
  const [isMoving, setIsMoving] = useState(false);
  const speed = 4.0;

  useEffect(() => {
    // 뼈대 애니메이션 이름 디버깅용 로그
    // console.log("Character Animations:", Object.keys(actions));
    
    // 스크린샷 기반으로 정확한 애니메이션 지정
    const walkAction = actions['Walking'] || actions['Casual_Walk'] || actions['Running'];
    const idleAction = actions['Alert']; // Idle이 없으므로 Alert을 대기 모션으로 사용

    // 두 액션이 같으면 겹침(글리치) 현상이 발생하므로 방어 코드 추가
    if (!walkAction || !idleAction || walkAction === idleAction) return;

    if (isMoving) {
      idleAction.fadeOut(0.2);
      walkAction.reset().fadeIn(0.2).play();
    } else {
      walkAction.fadeOut(0.2);
      idleAction.reset().fadeIn(0.2).play();
    }
  }, [isMoving, actions]);

  useFrame((_state, delta) => {
    if (!group.current || !targetPosition) {
      if (isMoving) setIsMoving(false);
      return;
    }

    const currentPos = group.current.position;
    const distance = currentPos.distanceTo(targetPosition);

    if (distance > 0.1) {
      setIsMoving(true);
      // 목표 지점을 향해 부드럽게 회전 (보간)
      const targetRotation = Math.atan2(targetPosition.x - currentPos.x, targetPosition.z - currentPos.z);
      
      // 회전 보간 로직 (가장 짧은 각도로 회전)
      let diff = targetRotation - group.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      group.current.rotation.y += diff * 10 * delta;

      // 목표 지점을 향해 이동 (y축 비행 방지)
      const direction = new THREE.Vector3().subVectors(targetPosition, currentPos);
      direction.y = 0;
      direction.normalize();
      
      group.current.position.add(direction.multiplyScalar(speed * delta));
    } else {
      setIsMoving(false);
    }
  });

  return (
    <group ref={group} position={[0, 0, 8]} dispose={null}>
      {/* 다시 발밑으로 기준점을 맞춥니다. */}
      <primitive object={scene} position={[0, 0, 0]} scale={1.5} castShadow />
    </group>
  );
};

useGLTF.preload('/charactor.glb');
