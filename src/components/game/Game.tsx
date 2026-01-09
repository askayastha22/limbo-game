// Main Game component

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameCanvas } from './GameCanvas';
import { GameUI } from '../ui/GameUI';
import { useInput } from '../../hooks/useInput';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useAudio } from '../../hooks/useAudio';
import { GameState, Player, LevelData, Vector2D } from '../../types/game';
import { PLAYER_WIDTH, PLAYER_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../game/constants';
import { updatePlayerPhysics, updatePushablePhysics, updateMovingPlatforms, updateRopePhysics, updateIdleRopePhysics, checkRopeGrab } from '../../game/physics';
import { ROPE_GRAB_DISTANCE } from '../../game/constants';
import { checkHazardCollision, rectIntersect, clamp } from '../../utils/collision';
import { levels } from '../../levels';

const createInitialPlayer = (startPosition: Vector2D): Player => ({
  position: { ...startPosition },
  velocity: { x: 0, y: 0 },
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  isGrounded: false,
  isJumping: false,
  isDead: false,
  isGrabbing: false,
  isOnRope: false,
  attachedRopeId: null,
  ropeGrabCooldown: 0,
  facingRight: true,
  animationState: 'idle',
});

const createInitialGameState = (levelIndex: number): GameState => {
  const levelData = levels[levelIndex];
  return {
    isPlaying: false,
    isPaused: false,
    currentLevel: levelIndex,
    player: createInitialPlayer(levelData.playerStart),
    camera: {
      x: levelData.playerStart.x,
      y: levelData.playerStart.y,
      zoom: 1,
      shake: 0,
    },
    lastCheckpoint: null,
    deathCount: 0,
    levelData,
  };
};

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(0));
  const [showStartScreen, setShowStartScreen] = useState(true);
  const input = useInput();
  const levelDataRef = useRef<LevelData>(levels[0]);

  // Audio system
  const { playDeathSound, playJumpSound, playLandSound, playCheckpointSound } = useAudio(
    gameState.isPlaying && !showStartScreen,
    0.4
  );

  // Track previous state for sound triggers
  const prevStateRef = useRef<{ wasGrounded: boolean; wasDead: boolean; wasJumping: boolean }>({
    wasGrounded: false,
    wasDead: false,
    wasJumping: false,
  });

  // Keep level data ref updated
  useEffect(() => {
    if (gameState.levelData) {
      levelDataRef.current = gameState.levelData;
    }
  }, [gameState.levelData]);

  // Sound effect triggers
  useEffect(() => {
    const prev = prevStateRef.current;
    const player = gameState.player;

    // Death sound
    if (player.isDead && !prev.wasDead) {
      playDeathSound();
    }

    // Jump sound
    if (player.isJumping && !prev.wasJumping && !player.isGrounded) {
      playJumpSound();
    }

    // Land sound
    if (player.isGrounded && !prev.wasGrounded && !player.isDead) {
      playLandSound();
    }

    // Update previous state
    prevStateRef.current = {
      wasGrounded: player.isGrounded,
      wasDead: player.isDead,
      wasJumping: player.isJumping,
    };
  }, [gameState.player, playDeathSound, playJumpSound, playLandSound]);

  const startGame = useCallback(() => {
    setShowStartScreen(false);
    setGameState((prev) => ({
      ...prev,
      isPlaying: true,
    }));
  }, []);

  const restartLevel = useCallback(() => {
    const levelData = levels[gameState.currentLevel];
    const respawnPoint = gameState.lastCheckpoint || levelData.playerStart;

    setGameState((prev) => ({
      ...prev,
      player: createInitialPlayer(respawnPoint),
      camera: {
        x: respawnPoint.x,
        y: respawnPoint.y,
        zoom: 1,
        shake: 0,
      },
      isPaused: false,
    }));
  }, [gameState.currentLevel, gameState.lastCheckpoint]);

  const nextLevel = useCallback(() => {
    const nextLevelIndex = gameState.currentLevel + 1;
    if (nextLevelIndex < levels.length) {
      setGameState(createInitialGameState(nextLevelIndex));
      setGameState((prev) => ({
        ...prev,
        isPlaying: true,
      }));
    } else {
      // Game complete
      setShowStartScreen(true);
      setGameState(createInitialGameState(0));
    }
  }, [gameState.currentLevel]);

  const togglePause = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isPaused: !prev.isPaused,
    }));
  }, []);

  // Handle escape key for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && gameState.isPlaying) {
        togglePause();
      }
      if (e.code === 'KeyR' && gameState.player.isDead) {
        restartLevel();
      }
      // Debug: Kill player with K key to test ragdoll
      if (e.code === 'KeyK' && gameState.isPlaying && !gameState.player.isDead) {
        setGameState((prev) => ({
          ...prev,
          player: { ...prev.player, isDead: true, animationState: 'dying' },
          deathCount: prev.deathCount + 1,
          camera: { ...prev.camera, shake: 1 },
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isPlaying, gameState.player.isDead, togglePause, restartLevel]);

  // Main game update loop
  const gameUpdate = useCallback(
    (deltaTime: number) => {
      if (!gameState.isPlaying || gameState.isPaused || !gameState.levelData) return;

      setGameState((prev) => {
        if (!prev.levelData) return prev;

        let newState = { ...prev };
        let levelData = { ...prev.levelData };

        // Don't update if dead (wait for restart)
        if (prev.player.isDead) {
          return prev;
        }

        // Update moving platforms
        levelData.platforms = updateMovingPlatforms(levelData.platforms, deltaTime);

        // Update pushable objects
        levelData.pushableObjects = updatePushablePhysics(
          levelData.pushableObjects,
          prev.player,
          levelData.platforms,
          input,
          deltaTime
        );

        // Check for rope grab/release and update rope physics
        let ropeResult = checkRopeGrab(prev.player, levelData.ropes, input, ROPE_GRAB_DISTANCE);
        let currentPlayer = ropeResult.player;
        levelData.ropes = ropeResult.ropes;

        // Update rope physics if player is on a rope
        if (currentPlayer.isOnRope && currentPlayer.attachedRopeId) {
          const attachedRope = levelData.ropes.find((r) => r.id === currentPlayer.attachedRopeId);
          if (attachedRope) {
            const ropePhysicsResult = updateRopePhysics(attachedRope, currentPlayer, input, deltaTime);
            currentPlayer = ropePhysicsResult.player;
            levelData.ropes = levelData.ropes.map((r) =>
              r.id === attachedRope.id ? ropePhysicsResult.rope : r
            );
          }
        }

        // Update idle ropes (swing back to natural position when player not attached)
        levelData.ropes = levelData.ropes.map((r) =>
          r.id !== currentPlayer.attachedRopeId ? updateIdleRopePhysics(r, deltaTime) : r
        );

        // Update player physics (skipped if on rope)
        const newPlayer = updatePlayerPhysics(currentPlayer, input, levelData, deltaTime);

        // Check hazard collisions
        for (const hazard of levelData.hazards) {
          if (checkHazardCollision(newPlayer, hazard)) {
            // Player dies
            newPlayer.isDead = true;
            newPlayer.animationState = 'dying';
            newState.deathCount += 1;
            newState.camera.shake = 1;
            break;
          }
        }

        // Check checkpoint collisions
        let checkpointActivated = false;
        levelData.checkpoints = levelData.checkpoints.map((cp) => {
          if (!cp.isActivated) {
            const playerRect = {
              x: newPlayer.position.x,
              y: newPlayer.position.y,
              width: newPlayer.width,
              height: newPlayer.height,
            };
            const cpRect = { x: cp.x, y: cp.y, width: cp.width, height: cp.height };

            if (rectIntersect(playerRect, cpRect)) {
              newState.lastCheckpoint = { x: cp.x, y: cp.y + cp.height - newPlayer.height };
              checkpointActivated = true;
              return { ...cp, isActivated: true };
            }
          }
          return cp;
        });

        // Play checkpoint sound outside of state update
        if (checkpointActivated) {
          setTimeout(() => playCheckpointSound(), 0);
        }

        // Check switch interactions
        levelData.switches = levelData.switches.map((sw) => {
          const playerRect = {
            x: newPlayer.position.x,
            y: newPlayer.position.y,
            width: newPlayer.width,
            height: newPlayer.height,
          };
          const swRect = { x: sw.x, y: sw.y, width: sw.width, height: sw.height };

          if (sw.type === 'pressurePlate') {
            // Check if player or pushable is on it
            let isPressed = rectIntersect(playerRect, swRect);

            if (!isPressed) {
              for (const pushable of levelData.pushableObjects) {
                const pushRect = {
                  x: pushable.x,
                  y: pushable.y,
                  width: pushable.width,
                  height: pushable.height,
                };
                if (rectIntersect(pushRect, swRect)) {
                  isPressed = true;
                  break;
                }
              }
            }

            if (isPressed !== sw.isActivated) {
              // Toggle connected hazards
              levelData.hazards = levelData.hazards.map((h) => {
                if (sw.targetIds.includes(h.id)) {
                  return { ...h, isActive: !isPressed };
                }
                return h;
              });
            }

            return { ...sw, isActivated: isPressed };
          } else if (rectIntersect(playerRect, swRect) && input.action && !sw.isActivated) {
            // Lever or button
            levelData.hazards = levelData.hazards.map((h) => {
              if (sw.targetIds.includes(h.id)) {
                return { ...h, isActive: false };
              }
              return h;
            });
            return { ...sw, isActivated: true };
          }

          return sw;
        });

        // Check exit zone
        const playerRect = {
          x: newPlayer.position.x,
          y: newPlayer.position.y,
          width: newPlayer.width,
          height: newPlayer.height,
        };

        if (rectIntersect(playerRect, levelData.exitZone)) {
          // Level complete - will trigger next level
          setTimeout(() => nextLevel(), 500);
        }

        // Update camera to follow player
        const targetCameraX = newPlayer.position.x + newPlayer.width / 2;
        const targetCameraY = newPlayer.position.y + newPlayer.height / 2;

        // Smooth camera follow
        const cameraSpeed = 0.08;
        const newCameraX = prev.camera.x + (targetCameraX - prev.camera.x) * cameraSpeed;
        const newCameraY = prev.camera.y + (targetCameraY - prev.camera.y) * cameraSpeed;

        // Clamp camera to level bounds
        const halfWidth = CANVAS_WIDTH / 2 / prev.camera.zoom;
        const halfHeight = CANVAS_HEIGHT / 2 / prev.camera.zoom;

        const camera = {
          x: clamp(newCameraX, halfWidth, levelData.width - halfWidth),
          y: clamp(newCameraY, halfHeight, levelData.height - halfHeight),
          zoom: prev.camera.zoom,
          shake: prev.camera.shake * 0.9, // Decay shake
        };

        return {
          ...newState,
          player: newPlayer,
          camera,
          levelData,
        };
      });
    },
    [gameState.isPlaying, gameState.isPaused, gameState.levelData, input, nextLevel, playCheckpointSound]
  );

  useGameLoop(gameUpdate, gameState.isPlaying && !gameState.isPaused);

  if (showStartScreen) {
    return (
      <GameUI
        type="start"
        onStart={startGame}
        deathCount={gameState.deathCount}
      />
    );
  }

  if (gameState.isPaused) {
    return (
      <>
        {gameState.levelData && (
          <GameCanvas gameState={gameState} levelData={gameState.levelData} />
        )}
        <GameUI
          type="pause"
          onResume={togglePause}
          onRestart={restartLevel}
          deathCount={gameState.deathCount}
        />
      </>
    );
  }

  if (gameState.player.isDead) {
    return (
      <>
        {gameState.levelData && (
          <GameCanvas gameState={gameState} levelData={gameState.levelData} />
        )}
        <GameUI
          type="death"
          onRestart={restartLevel}
          deathCount={gameState.deathCount}
        />
      </>
    );
  }

  return (
    <>
      {gameState.levelData && (
        <GameCanvas gameState={gameState} levelData={gameState.levelData} />
      )}
      <GameUI
        type="hud"
        deathCount={gameState.deathCount}
        currentLevel={gameState.currentLevel + 1}
        levelName={gameState.levelData?.name || ''}
      />
    </>
  );
};
