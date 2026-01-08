// Custom hook for handling keyboard input

import { useState, useEffect, useCallback } from 'react';
import { InputState } from '../types/game';
import { KEY_BINDINGS } from '../game/constants';

export function useInput(): InputState {
  const [inputState, setInputState] = useState<InputState>({
    left: false,
    right: false,
    jump: false,
    action: false,
  });

  const isKeyMatching = useCallback((code: string, keys: string[]): boolean => {
    return keys.includes(code);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default for game keys
    if (
      KEY_BINDINGS.left.includes(e.code) ||
      KEY_BINDINGS.right.includes(e.code) ||
      KEY_BINDINGS.jump.includes(e.code) ||
      KEY_BINDINGS.action.includes(e.code)
    ) {
      e.preventDefault();
    }

    setInputState((prev) => ({
      left: isKeyMatching(e.code, KEY_BINDINGS.left) ? true : prev.left,
      right: isKeyMatching(e.code, KEY_BINDINGS.right) ? true : prev.right,
      jump: isKeyMatching(e.code, KEY_BINDINGS.jump) ? true : prev.jump,
      action: isKeyMatching(e.code, KEY_BINDINGS.action) ? true : prev.action,
    }));
  }, [isKeyMatching]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setInputState((prev) => ({
      left: isKeyMatching(e.code, KEY_BINDINGS.left) ? false : prev.left,
      right: isKeyMatching(e.code, KEY_BINDINGS.right) ? false : prev.right,
      jump: isKeyMatching(e.code, KEY_BINDINGS.jump) ? false : prev.jump,
      action: isKeyMatching(e.code, KEY_BINDINGS.action) ? false : prev.action,
    }));
  }, [isKeyMatching]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return inputState;
}
