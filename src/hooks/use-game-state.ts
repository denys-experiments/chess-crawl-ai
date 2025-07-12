
"use client";

import { useState, useCallback, useEffect } from 'react';
import type { Piece, Board, Position, AvailableMove, HistoryEntry } from '@/types';

export const SAVE_GAME_KEY = 'chess-crawl-save-game';
export const SOUND_ENABLED_KEY = 'chess-crawl-sound-enabled';

export function useGameState() {
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<Board | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [availableMoves, setAvailableMoves] = useState<AvailableMove[]>([]);
  const [playerPieces, setPlayerPieces] = useState<Piece[]>([]);
  const [enemyPieces, setEnemyPieces] = useState<Piece[]>([]);
  const [inventory, setInventory] = useState<{ pieces: Piece[], cosmetics: string[] }>({ pieces: [], cosmetics: [] });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnemyThinking, setIsEnemyThinking] = useState(false);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [isKingInCheck, setIsKingInCheck] = useState(false);
  const [debugLog, setDebugLog] = useState('');
  const [currentTurn, setCurrentTurn] = useState('player');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabledState] = useState(true);

  useEffect(() => {
    const savedSoundSetting = localStorage.getItem(SOUND_ENABLED_KEY);
    if (savedSoundSetting !== null) {
      setIsSoundEnabledState(JSON.parse(savedSoundSetting));
    }
  }, []);

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
    setPlayerPieces,
    setEnemyPieces,
    setInventory,
    setHistory,
    addToHistory,
    setIsLevelComplete,
    setIsGameOver,
    setIsLoading,
    setIsEnemyThinking,
    setIsPlayerMoving,
    setIsKingInCheck,
    setDebugLog,
    appendToDebugLog,
    setCurrentTurn,
    setIsHelpOpen,
    setIsSoundEnabled,
  };
  
  return { get, setters };
}

export type UseGameStateReturn = ReturnType<typeof useGameState>;
