
"use client";

import { useEffect, useCallback, useMemo } from 'react';
import type { Piece, PieceType, HistoryEntry } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/context/i18n';
import { useGameState, SAVE_GAME_KEY, SOUND_ENABLED_KEY } from './use-game-state';
import { useGameActions } from './use-game-actions';
import { useEnemyAI } from './use-enemy-ai';
import { initializeBoard } from '@/lib/game-logic';
import { generateRandomName } from '@/lib/names';

export function useGame() {
  const state = useGameState();
  const { toast } = useToast();
  const { t, getPieceDisplayName } = useTranslation();

  const {
    level,
    isLoading,
    isGameOver,
    isLevelComplete,
    board,
    currentTurn,
    history,
    inventory,
    isSoundEnabled,
    playerPieces,
  } = state.get();
  
  const {
      setBoard,
      setPlayerPieces,
      setEnemyPieces,
      setIsKingInCheck,
      setIsLevelComplete,
      setIsGameOver,
      setIsLoading,
      setCurrentTurn,
      setHistory,
      addToHistory,
      appendToDebugLog
  } = state.setters;
  

  const actions = useGameActions(state, getPieceDisplayName);
  const { runEnemyTurn } = useEnemyAI(state, getPieceDisplayName, actions.advanceTurn);
  
  const setupLevel = useCallback((levelToSetup: number, piecesToCarry: Piece[]) => {
    setIsLoading(true);

    let finalPieces = piecesToCarry;
    let isNewGame = false;
    
    if (levelToSetup === 1 && piecesToCarry.length === 0) {
        isNewGame = true;
        finalPieces = [
            { type: 'piece', piece: 'King', color: 'white', x: 0, y: 0, id: `wk-${Date.now()}`, name: generateRandomName(), discoveredOnLevel: 1, captures: 0 },
            { type: 'piece', piece: 'Pawn', color: 'white', x: 0, y: 0, id: `wp1-${Date.now()}`, direction: 'up', name: generateRandomName(), discoveredOnLevel: 1, captures: 0 },
            { type: 'piece', piece: 'Pawn', color: 'white', x: 0, y: 0, id: `wp2-${Date.now()}`, direction: 'up', name: generateRandomName(), discoveredOnLevel: 1, captures: 0 }
        ];
    }

    if (isNewGame) {
      setHistory([]);
      addToHistory({ key: 'history.levelStart', values: { level: 1 } });
    } else {
      addToHistory({ key: 'history.levelStart', values: { level: levelToSetup } });
      const carriedOverPieces = piecesToCarry.filter(p => p.piece !== 'King');
      carriedOverPieces.forEach(piece => {
        addToHistory({
          key: 'history.pieceCarriedOver',
          values: {
            name: getPieceDisplayName(piece.name),
            pieceKey: `pieces.${piece.piece}`
          }
        });
      });
    }
    
    state.setters.setLevel(levelToSetup);
    
    const { board: newBoard } = initializeBoard(levelToSetup, finalPieces);
    
    actions.checkForAllyRescueOnSetup(newBoard, levelToSetup);
    
    setBoard(newBoard);
    setCurrentTurn('player');
    
    setIsLevelComplete(false);
    state.setters.setSelectedPiece(null);

    let log = '';
    if (isNewGame) {
        log = `--- STARTING NEW GAME (LEVEL 1) ---\n`;
    } else {
        log = `--- STARTING LEVEL ${levelToSetup} ---\n`;
    }
    const playerPiecesOnBoard: Piece[] = [];
    newBoard.forEach(row => row.forEach(tile => {
        if (tile?.type === 'piece' && tile.color === 'white') {
            playerPiecesOnBoard.push(tile);
        }
    }));
    log += `Player pieces on board: ${playerPiecesOnBoard.length}\n`;
    log += JSON.stringify(playerPiecesOnBoard.map(p => ({ piece: p.piece, name: getPieceDisplayName(p.name), id: p.id, level: p.discoveredOnLevel, captures: p.captures })), null, 2);
    appendToDebugLog(log);
    
    setIsLoading(false);
  }, [state.setters, addToHistory, getPieceDisplayName, appendToDebugLog, actions]);
  
  useEffect(() => {
    const savedGame = localStorage.getItem(SAVE_GAME_KEY);
    if (savedGame) {
        try {
            const parsedData = JSON.parse(savedGame);
            state.setters.setLevel(parsedData.level);
            setBoard(parsedData.board);
            setCurrentTurn(parsedData.currentTurn);
            setHistory(parsedData.history || []);
            state.setters.setInventory(parsedData.inventory || { pieces: [], cosmetics: [] });
            setIsLoading(false);
        } catch (error) {
            console.error("Failed to load saved game, starting new game.", error);
            localStorage.removeItem(SAVE_GAME_KEY);
            setupLevel(1, []);
        }
    } else {
        setupLevel(1, []);
    }
    
    const savedSoundSetting = localStorage.getItem(SOUND_ENABLED_KEY);
    if (savedSoundSetting !== null) {
      state.setters.setIsSoundEnabled(JSON.parse(savedSoundSetting));
    }
  }, [setupLevel]);

  useEffect(() => {
    if (isLoading || isGameOver || isLevelComplete) {
        return;
    }
    const gameState = {
        level,
        board,
        currentTurn,
        history,
        inventory,
    };
    localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(gameState));
    localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(isSoundEnabled));
  }, [board, currentTurn, history, level, inventory, isLoading, isGameOver, isLevelComplete, isSoundEnabled]);

  useEffect(() => {
    if (!board) return;

    const newPlayerPieces: Piece[] = [];
    const newEnemyPieces: Piece[] = [];

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
    setPlayerPieces(newPlayerPieces);
    setEnemyPieces(newEnemyPieces);
    
    const playerKing = newPlayerPieces.find(p => p.piece === 'King');
    if (playerKing) {
        const enemyFactions = Array.from(new Set(newEnemyPieces.map(p => p.color)));
        const inCheck = actions.isSquareAttackedBy({ x: playerKing.x, y: playerKing.y }, board, enemyFactions);
        if (inCheck && !state.get().isKingInCheck) {
            if (isSoundEnabled) actions.playSound('check');
        }
        setIsKingInCheck(inCheck);
    } else {
        setIsKingInCheck(false);
    }

    if (level > 0 && !isLoading) {
      if (newEnemyPieces.length === 0 && newPlayerPieces.length > 0 && !isLevelComplete) {
        if (isSoundEnabled) actions.playSound('win');
        setIsLevelComplete(true);
      } else if ((newPlayerPieces.length === 0 || !playerKing) && !isGameOver) {
        if (isSoundEnabled) actions.playSound('lose');
        setIsGameOver(true);
        localStorage.removeItem(SAVE_GAME_KEY);
      }
    }
  }, [board, level, isLoading, state.get().isKingInCheck, isLevelComplete, isGameOver, isSoundEnabled, setPlayerPieces, setEnemyPieces, setIsKingInCheck, setIsLevelComplete, setIsGameOver, actions]);
  
  useEffect(() => {
    if (state.get().currentTurn !== 'player' && !state.get().isEnemyThinking && !isGameOver && !isLevelComplete) {
      runEnemyTurn(state.get().currentTurn);
    }
  }, [state.get().currentTurn, state.get().isEnemyThinking, runEnemyTurn, isGameOver, isLevelComplete]);
  
  const restartGame = () => {
    localStorage.removeItem(SAVE_GAME_KEY);
    setIsLoading(true);
    state.setters.setDebugLog('');
    state.setters.setSelectedPiece(null);
    state.setters.setAvailableMoves([]);
    state.setters.setInventory({ pieces: [], cosmetics: [] });
    setHistory([]);
    setIsGameOver(false);
    setupLevel(1, []);
  };
  
  const handleCarryOver = (piecesToCarry: Piece[]) => {
      const king = playerPieces.find(p => p.piece === 'King');
      
      const clonedCarriedPieces = piecesToCarry.map(p => ({
          ...p,
          id: `${p.piece.toLowerCase()}-${Date.now()}-${Math.random()}`
      }));
      
      const clonedKing = king ? [{
          ...king, 
          id: `wk-${Date.now()}`
      }] : [];

      let finalPiecesForNextLevel = [...clonedCarriedPieces, ...clonedKing];

      if (finalPiecesForNextLevel.length <= 1 && level > 0) {
           finalPiecesForNextLevel.push({
              type: 'piece', piece: 'Pawn', color: 'white', x: 0, y: 0, 
              id: `wp-new-${level+1}-${Date.now()}`, direction: 'up', 
              name: generateRandomName(), discoveredOnLevel: level + 1, captures: 0
          });
      }
      
      state.setters.setInventory(prev => ({...prev, pieces: finalPiecesForNextLevel}));
      setupLevel(level + 1, finalPiecesForNextLevel);
  };

  // --- CHEAT FUNCTIONS ---
  const handleRegenerateLevel = (width: number, height: number, numFactions: number) => {
    if (!board) return;
    setIsLoading(true);
    const king = playerPieces.find(p => p.piece === 'King');
    const { board: newBoard, factions } = initializeBoard(level, king ? [king] : [], { width, height, numFactions });
    setBoard(newBoard);
    state.setters.setSelectedPiece(null);
    state.setters.setAvailableMoves([]);
    setCurrentTurn('player');
    setHistory([]);
    setIsLevelComplete(false);
    setIsGameOver(false);
    toast({ title: t('toast.cheatActivated'), description: t('toast.levelRegenerated', { width, height, factions: factions.length }) });
  }

  const handleCreatePiece = (pieceType: PieceType) => {
    if (!board) return;
    const king = playerPieces.find(p => p.piece === 'King');
    if (!king) {
        toast({ title: t('toast.cheatFailed'), description: t('toast.kingNotFound'), variant: "destructive" });
        return;
    }
    const { x: kingX, y: kingY } = king;
    const possibleSpawns: {x: number, y: number}[] = [
        { x: kingX - 1, y: kingY }, { x: kingX + 1, y: kingY },
        { x: kingX, y: kingY - 1 }, { x: kingX, y: kingY + 1 },
        { x: kingX - 1, y: kingY - 1 }, { x: kingX + 1, y: kingY - 1 },
        { x: kingX - 1, y: kingY + 1 }, { x: kingX + 1, y: kingY + 1 },
    ].filter(p => actions.isWithinBoard(p.x, p.y, board) && !board[p.y][p.x]);

    if (possibleSpawns.length === 0) {
        toast({ title: t('toast.cheatFailed'), description: t('toast.noEmptySpace'), variant: "destructive" });
        return;
    }

    const spawnPos = possibleSpawns[0];
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    newBoard[spawnPos.y][spawnPos.x] = {
        type: 'piece',
        piece: pieceType,
        color: 'white',
        x: spawnPos.x,
        y: spawnPos.y,
        id: `${pieceType}-${Date.now()}`,
        name: generateRandomName(),
        discoveredOnLevel: level,
        captures: 0,
    };
    setBoard(newBoard);
    toast({ title: t('toast.cheatActivated'), description: t('toast.pieceCreated', { pieceType: t(`pieces.${pieceType}`) }) });
  }

  const handlePromotePawn = () => {
    if (!board) return;
    const pawns = playerPieces.filter(p => p.piece === 'Pawn');
    if (pawns.length === 0) {
        toast({ title: t('toast.cheatFailed'), description: t('toast.noPawnsToPromote'), variant: "destructive" });
        return;
    }
    const randomPawn = pawns[Math.floor(Math.random() * pawns.length)];
    const newPieceType = actions.getPromotionPiece(level, playerPieces);
    
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const pawnToPromote = newBoard[randomPawn.y][randomPawn.x];
    if (pawnToPromote?.type === 'piece') {
        (newBoard[randomPawn.y][randomPawn.x] as Piece) = {
            ...pawnToPromote,
            piece: newPieceType,
            direction: undefined,
        };
        setBoard(newBoard);
        toast({ title: t('toast.cheatActivated'), description: t('toast.pawnPromoted', { pieceType: t(`pieces.${newPieceType}`) }) });
    }
  }
  
  return {
    state: state.get(),
    actions: {
      handleTileClick: actions.handleTileClick,
      restartGame,
      handleCarryOver,
      setIsHelpOpen: state.setters.setIsHelpOpen,
      setIsSoundEnabled: state.setters.setIsSoundEnabled,
      handleRegenerateLevel,
      handleWinLevel: actions.handleWinLevel,
      handleCreatePiece,
      handlePromotePawn,
      handleAwardCosmetic: actions.handleAwardCosmetic,
    },
    getPieceDisplayName,
  }
}
