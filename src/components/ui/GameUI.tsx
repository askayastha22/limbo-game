// Game UI components (start screen, pause menu, HUD, death screen)

import React, { useState, useEffect } from 'react';
import './GameUI.css';

interface GameUIProps {
  type: 'start' | 'pause' | 'death' | 'hud';
  onStart?: () => void;
  onResume?: () => void;
  onRestart?: () => void;
  deathCount: number;
  currentLevel?: number;
  levelName?: string;
}

export const GameUI: React.FC<GameUIProps> = ({
  type,
  onStart,
  onResume,
  onRestart,
  deathCount,
  currentLevel,
  levelName,
}) => {
  if (type === 'start') {
    return <StartScreen onStart={onStart!} />;
  }

  if (type === 'pause') {
    return <PauseMenu onResume={onResume!} onRestart={onRestart!} deathCount={deathCount} />;
  }

  if (type === 'death') {
    return <DeathScreen onRestart={onRestart!} deathCount={deathCount} />;
  }

  return <HUD deathCount={deathCount} currentLevel={currentLevel!} levelName={levelName!} />;
};

const StartScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div className="ui-overlay start-screen">
      <div className="start-content">
        <h1 className="game-title">SHADOW</h1>
        <p className="game-subtitle">A journey through darkness</p>

        <div className="start-instructions">
          <p>In the shadows, a boy awakens...</p>
          <p>searching for answers in the dark.</p>
        </div>

        <button className="start-button" onClick={onStart}>
          BEGIN
        </button>

        <div className="controls-hint">
          <h3>Controls</h3>
          <div className="control-row">
            <span className="key">A/D or Arrow Keys</span>
            <span className="action">Move</span>
          </div>
          <div className="control-row">
            <span className="key">W/Space</span>
            <span className="action">Jump</span>
          </div>
          <div className="control-row">
            <span className="key">E/Shift</span>
            <span className="action">Grab/Interact</span>
          </div>
          <div className="control-row">
            <span className="key">Esc</span>
            <span className="action">Pause</span>
          </div>
        </div>

        <p className="credit">Inspired by Playdead's LIMBO</p>
      </div>
    </div>
  );
};

const PauseMenu: React.FC<{
  onResume: () => void;
  onRestart: () => void;
  deathCount: number;
}> = ({ onResume, onRestart, deathCount }) => {
  return (
    <div className="ui-overlay pause-screen">
      <div className="pause-content">
        <h2>PAUSED</h2>

        <div className="pause-stats">
          <p>Deaths: {deathCount}</p>
        </div>

        <div className="pause-buttons">
          <button className="menu-button" onClick={onResume}>
            Resume
          </button>
          <button className="menu-button" onClick={onRestart}>
            Restart Level
          </button>
        </div>

        <p className="pause-hint">Press ESC to resume</p>
      </div>
    </div>
  );
};

const DeathScreen: React.FC<{
  onRestart: () => void;
  deathCount: number;
}> = ({ onRestart, deathCount }) => {
  const [showUI, setShowUI] = useState(false);

  // Delay showing the death UI so ragdoll animation can be seen
  useEffect(() => {
    const timer = setTimeout(() => setShowUI(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`ui-overlay death-screen ${showUI ? 'visible' : 'hidden'}`}>
      <div className="death-content">
        <div className="death-text">
          <p>Death is just another lesson...</p>
        </div>

        <p className="death-count">Deaths: {deathCount}</p>

        <button className="restart-button" onClick={onRestart}>
          Try Again
        </button>

        <p className="death-hint">Press R to restart</p>
      </div>
    </div>
  );
};

const HUD: React.FC<{
  deathCount: number;
  currentLevel: number;
  levelName: string;
}> = ({ deathCount, currentLevel, levelName }) => {
  return (
    <div className="hud">
      <div className="hud-top-left">
        <span className="level-indicator">
          Chapter {currentLevel}: {levelName}
        </span>
      </div>
      <div className="hud-top-right">
        <span className="death-counter">Deaths: {deathCount}</span>
      </div>
    </div>
  );
};
