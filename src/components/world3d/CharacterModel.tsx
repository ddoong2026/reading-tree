import React, { useEffect, useRef, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../../hooks/useKeyboard';

interface CharacterModelProps {
  targetPosition: THREE.Vector3 | null;
  controlMode: 'click' | 'keyboard';
}

export const CharacterModel: React.FC<CharacterModelProps> = ({ targetPosition, controlMode }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/charactor.glb');
  const { actions } = useAnimations(animations, group);
  
  const [isMoving, setIsMoving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const yVel = useRef(0);
  
  const speed = 4.0;
  const keyboard = useKeyboard();

  useEffect(() => {
    const walkAction = actions['Walking'] || actions['Casual_Walk'];
    const runAction = actions['Running'];
    const idleAction = actions['Alert'];

    if (!walkAction || !idleAction || walkAction === idleAction) return;

    // 우선 모든 액션 정지 후 상태에 맞는 액션 1개만 플레이
    if (idleAction.isRunning()) idleAction.fadeOut(0.2);
    if (walkAction.isRunning()) walkAction.fadeOut(0.2);
    if (runAction && runAction.isRunning()) runAction.fadeOut(0.2);

    if (isMoving) {
      if (isRunning && runAction) {
        runAction.reset().fadeIn(0.2).play();
      } else {
        walkAction.reset().fadeIn(0.2).play();
      }
    } else {
      idleAction.reset().fadeIn(0.2).play();
    }
  }, [isMoving, isRunning, actions]);

  useFrame((state, delta) => {
    if (!group.current) return;

    if (controlMode === 'keyboard') {
      let moving = false;
      const currentSpeed = keyboard.run ? speed * 2 : speed;

      // 회전 (좌우)
      const rotationSpeed = 3.0 * delta;
      if (keyboard.left) group.current.rotation.y += rotationSpeed;
      if (keyboard.right) group.current.rotation.y -= rotationSpeed;

      // 전진/후진 (THREE.js 기본 축 기준으로 +Z가 앞면이라고 가정)
      if (keyboard.forward) {
        group.current.translateZ(currentSpeed * delta);
        moving = true;
      }
      if (keyboard.backward) {
        group.current.translateZ(-currentSpeed * delta);
        moving = true;
      }

      setIsMoving(moving);
      setIsRunning(moving && keyboard.run);

      // 점프 물리 연산
      if (keyboard.jump && !isJumping) {
        setIsJumping(true);
        yVel.current = 10; // 점프 초기 속도
      }

      if (isJumping) {
        group.current.position.y += yVel.current * delta;
        yVel.current -= 25 * delta; // 중력 적용
        
        // 바닥에 닿음
        if (group.current.position.y <= 0) {
          group.current.position.y = 0;
          setIsJumping(false);
          yVel.current = 0;
        }
      }

      // 카메라 추적 (3인칭 백뷰 - TPS)
      // 캐릭터 등 뒤(-Z 방향) 위(Y)에 카메라 위치 설정
      const idealOffset = new THREE.Vector3(0, 3, -6);
      idealOffset.applyQuaternion(group.current.quaternion);
      idealOffset.add(group.current.position);

      const idealLookAt = group.current.position.clone().add(new THREE.Vector3(0, 1.5, 0));

      state.camera.position.lerp(idealOffset, 0.1);
      state.camera.lookAt(idealLookAt);

    } else {
      // 마우스 클릭 모드 로직 (기존)
      if (!targetPosition) {
        if (isMoving) setIsMoving(false);
        setIsRunning(false);
        return;
      }

      const currentPos = group.current.position;
      const distance = new THREE.Vector2(currentPos.x, currentPos.z).distanceTo(new THREE.Vector2(targetPosition.x, targetPosition.z));

      if (distance > 0.1) {
        setIsMoving(true);
        setIsRunning(false);

        const targetRotation = Math.atan2(targetPosition.x - currentPos.x, targetPosition.z - currentPos.z);
        let diff = targetRotation - group.current.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        group.current.rotation.y += diff * 10 * delta;

        const direction = new THREE.Vector3().subVectors(targetPosition, currentPos);
        direction.y = 0;
        direction.normalize();
        
        group.current.position.add(direction.multiplyScalar(speed * delta));
      } else {
        setIsMoving(false);
      }
    }
  });

  return (
    <group ref={group} position={[0, 0, 8]} dispose={null}>
      <primitive object={scene} position={[0, 0, 0]} scale={1.5} castShadow />
    </group>
  );
};

useGLTF.preload('/charactor.glb');
