import { useState, useEffect } from 'react';

export function useKeyboard() {
  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
    jump: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((prev) => {
        switch (e.code) {
          case 'KeyW':
          case 'ArrowUp':
            return { ...prev, forward: true };
          case 'KeyS':
          case 'ArrowDown':
            return { ...prev, backward: true };
          case 'KeyA':
          case 'ArrowLeft':
            return { ...prev, left: true };
          case 'KeyD':
          case 'ArrowRight':
            return { ...prev, right: true };
          case 'ShiftLeft':
          case 'ShiftRight':
            return { ...prev, run: true };
          case 'Space':
            return { ...prev, jump: true };
          default:
            return prev;
        }
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => {
        switch (e.code) {
          case 'KeyW':
          case 'ArrowUp':
            return { ...prev, forward: false };
          case 'KeyS':
          case 'ArrowDown':
            return { ...prev, backward: false };
          case 'KeyA':
          case 'ArrowLeft':
            return { ...prev, left: false };
          case 'KeyD':
          case 'ArrowRight':
            return { ...prev, right: false };
          case 'ShiftLeft':
          case 'ShiftRight':
            return { ...prev, run: false };
          case 'Space':
            return { ...prev, jump: false };
          default:
            return prev;
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return keys;
}
