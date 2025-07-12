
"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Piece, Board, Position, AvailableMove, HistoryEntry } from '@/types';
import { isSquareAttackedBy as isSquareAttackedByFromLogic } from '@/lib/game-logic';
import { playSound } from '@/lib/sounds';

export const SAVE_GAME_KEY = 'chess-crawl-save-game';
export const SOUND_ENABLED_KEY = 'chess-crawl-sound-enabled';

export function useGameState() {
  // Raw state that is saved/loaded
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<Board | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [inventory, setInventory] = useState<{ pieces: Piece[], cosmetics: string[] }>({ pieces: [], cosmetics: [] });
  const [currentTurn, setCurrentTurn] = useState('player');
  const [isLoading, setIsLoading] = useState(true);

  // UI/session state
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [availableMoves, setAvailableMoves] = useState<AvailableMove[]>([]);
  const [isEnemyThinking, setIsEnemyThinking] = useState(false);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [debugLog, setDebugLog] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabledState] = useState(true);

  // Load sound settings from localStorage on initial render
  useEffect(() => {
    const savedSoundSetting = localStorage.getItem(SOUND_ENABLED_KEY);
    if (savedSoundSetting !== null) {
      setIsSoundEnabledState(JSON.parse(savedSoundSetting));
    }
  }, []);

  // Derived state, calculated on-the-fly with useMemo
  const { playerPieces, enemyPieces } = useMemo(() => {
    const newPlayerPieces: Piece[] = [];
    const newEnemyPieces: Piece[] = [];
    if (board) {
      board.forEach((row) => {
        row.forEach((tile) => {
          if (tile?.type === 'piece') {
            if (tile.color === 'white') {
              newPlayerPieces.push(tile);
            } else {
              newEnemyPieces.push(tile);
            }
          }
        });
      });
    }
    return { playerPieces: newPlayerPieces, enemyPieces: newEnemyPieces };
  }, [board]);
  
  const isKingInCheck = useMemo(() => {
    if (!board) return false;
    const playerKing = playerPieces.find(p => p.piece === 'King');
    if (!playerKing) return false;
    const enemyFactions = Array.from(new Set(enemyPieces.map(p => p.color)));
    return isSquareAttackedByFromLogic({ x: playerKing.x, y: playerKing.y }, board, enemyFactions);
  }, [board, playerPieces, enemyPieces]);

  // Derived state for game-over/level-complete conditions
  const isGameOver = useMemo(() => {
      if (isLoading || level === 0) return false;
      const playerKing = playerPieces.find(p => p.piece === 'King');
      return !playerKing || playerPieces.length === 0;
  }, [playerPieces, isLoading, level]);

  const isLevelComplete = useMemo(() => {
      if (isLoading || isGameOver || level === 0) return false;
      return enemyPieces.length === 0 && playerPieces.length > 0;
  }, [enemyPieces.length, playerPieces.length, isGameOver, isLoading, level]);

  // Play sounds for check/win/lose based on derived state changes
  useEffect(() => {
    if (isSoundEnabled) {
      if (isKingInCheck) playSound('check');
    }
  }, [isKingInCheck, isSoundEnabled]);

  useEffect(() => {
    if (isSoundEnabled) {
      if (isLevelComplete) playSound('win');
      if (isGameOver) playSound('lose');
    }
  }, [isLevelComplete, isGameOver, isSoundEnabled]);


  const setIsSoundEnabled = useCallback((value: boolean | ((prevState: boolean) => boolean)) => {
    setIsSoundEnabledState(prev => {
      const newState = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  const addToHistory = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev].slice(0, 50));
  }, []);

  const appendToDebugLog = useCallback((message: string) => {
    setDebugLog(prev => `${prev}\n\n${message}`.trim());
  }, []);

  // State getter for external hooks that need access to the latest state
  const get = useCallback(() => ({
    level,
    board,
    selectedPiece,
    availableMoves,
    playerPieces,
    enemyPieces,
    inventory,
    history,
    isLevelComplete,
    isGameOver,
    isLoading,
    isEnemyThinking,
    isPlayerMoving,
    isKingInCheck,
    debugLog,
    currentTurn,
    isHelpOpen,
    isSoundEnabled,
  }), [
    level, board, selectedPiece, availableMoves, playerPieces, enemyPieces,
    inventory, history, isLevelComplete, isGameOver, isLoading,
    isEnemyThinking, isPlayerMoving, isKingInCheck, debugLog, currentTurn,
    isHelpOpen, isSoundEnabled
  ]);

  const setters = {
    setLevel,
    setBoard,
    setSelectedPiece,
    setAvailableMoves,
    setInventory,
    setHistory,
    addToHistory,
    setIsLoading,
    setIsEnemyThinking,
    setIsPlayerMoving,
    setDebugLog,
    appendToDebugLog,
    setCurrentTurn,
    setIsHelpOpen,
    setIsSoundEnabled,
  };
  
  return { get, setters };
}

export type UseGameStateReturn = ReturnType<typeof useGameState>;
