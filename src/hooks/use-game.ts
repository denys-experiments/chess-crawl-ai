
"use client";

import { useEffect, useCallback } from 'react';
import type { Piece, PieceType, HistoryEntry } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/context/i18n';
import { useGameState, SAVE_GAME_KEY } from './use-game-state';
import { useGameActions } from './use-game-actions';
import { useEnemyAI } from './use-enemy-ai';
import { initializeBoard } from '@/lib/game-logic';
import { generateRandomName } from '@/lib/names';

export function useGame() {
  const stateAndSetters = useGameState();
  const { get: getState, setters } = stateAndSetters;

  const { toast } = useToast();
  const { t } = useTranslation();

  const gameActions = useGameActions(getState, setters);
  const { runEnemyTurn } = useEnemyAI(getState, setters, gameActions.advanceTurn);
  
  const setupLevel = useCallback((levelToSetup: number, piecesToCarry: Piece[]) => {
    setters.setIsLoading(true);

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
      setters.setHistory([]);
      setters.addToHistory(gameActions.createHistoryEntry('history.levelStart', { level: 1 }));
    } else {
      setters.addToHistory(gameActions.createHistoryEntry('history.levelStart', { level: levelToSetup }));
      const carriedOverPieces = piecesToCarry.filter(p => p.piece !== 'King');
      carriedOverPieces.forEach(piece => {
        setters.addToHistory(
          gameActions.createHistoryEntry('history.pieceCarriedOver', {
            name: piece.name,
            pieceKey: `pieces.${piece.piece}`
          })
        );
      });
    }
    
    setters.setLevel(levelToSetup);
    
    const { board: newBoard } = initializeBoard(levelToSetup, finalPieces);
    
    gameActions.checkForAllyRescueOnSetup(newBoard, levelToSetup);
    
    setters.setBoard(newBoard);
    setters.setCurrentTurn('player');
    
    setters.setIsLevelComplete(false);
    setters.setSelectedPiece(null);

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
    log += JSON.stringify(playerPiecesOnBoard.map(p => ({ piece: p.piece, name: p.name, id: p.id, level: p.discoveredOnLevel, captures: p.captures })), null, 2);
    setters.appendToDebugLog(log);
    
    setters.setIsLoading(false);
  }, [setters, gameActions, t]);
  
  useEffect(() => {
    const savedGame = localStorage.getItem(SAVE_GAME_KEY);
    if (savedGame) {
        try {
            const parsedData = JSON.parse(savedGame);
            setters.setLevel(parsedData.level);
            setters.setBoard(parsedData.board);
            setters.setCurrentTurn(parsedData.currentTurn);
            setters.setHistory(parsedData.history || []);
            setters.setInventory(parsedData.inventory || { pieces: [], cosmetics: [] });
            setters.setIsLoading(false);
        } catch (error) {
            console.error("Failed to load saved game, starting new game.", error);
            localStorage.removeItem(SAVE_GAME_KEY);
            setupLevel(1, []);
        }
    } else {
        setupLevel(1, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const {
        level, board, currentTurn, history, inventory, isLoading, isGameOver, isLevelComplete
    } = getState();

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
  }, [getState]);

  useEffect(() => {
    const { board, level, isLoading, isLevelComplete, isGameOver, isKingInCheck } = getState();
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
    setters.setPlayerPieces(newPlayerPieces);
    setters.setEnemyPieces(newEnemyPieces);
    
    const playerKing = newPlayerPieces.find(p => p.piece === 'King');
    if (playerKing) {
        const enemyFactions = Array.from(new Set(newEnemyPieces.map(p => p.color)));
        const inCheck = gameActions.isSquareAttackedBy({ x: playerKing.x, y: playerKing.y }, board, enemyFactions);
        if (inCheck && !isKingInCheck) {
            if(getState().isSoundEnabled) gameActions.playSound('check');
        }
        setters.setIsKingInCheck(inCheck);
    } else {
        setters.setIsKingInCheck(false);
    }

    if (level > 0 && !isLoading) {
      if (newEnemyPieces.length === 0 && newPlayerPieces.length > 0 && !isLevelComplete) {
        if(getState().isSoundEnabled) gameActions.playSound('win');
        setters.setIsLevelComplete(true);
      } else if ((newPlayerPieces.length === 0 || !playerKing) && !isGameOver) {
        if(getState().isSoundEnabled) gameActions.playSound('lose');
        setters.setIsGameOver(true);
        localStorage.removeItem(SAVE_GAME_KEY);
      }
    }
  }, [getState, setters, gameActions]);
  
  useEffect(() => {
    const { currentTurn, isEnemyThinking, isGameOver, isLevelComplete } = getState();
    if (currentTurn !== 'player' && !isEnemyThinking && !isGameOver && !isLevelComplete) {
      runEnemyTurn(currentTurn);
    }
  }, [getState, runEnemyTurn]);
  
  const restartGame = () => {
    localStorage.removeItem(SAVE_GAME_KEY);
    setters.setIsLoading(true);
    setters.setDebugLog('');
    setters.setSelectedPiece(null);
    setters.setAvailableMoves([]);
    setters.setInventory({ pieces: [], cosmetics: [] });
    setters.setHistory([]);
    setters.setIsGameOver(false);
    setupLevel(1, []);
  };
  
  const handleCarryOver = (piecesToCarry: Piece[]) => {
      const { playerPieces, level } = getState();
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
      
      setters.setInventory(prev => ({...prev, pieces: finalPiecesForNextLevel}));
      setupLevel(level + 1, finalPiecesForNextLevel);
  };

  // --- CHEAT FUNCTIONS ---
  const handleRegenerateLevel = (width: number, height: number, numFactions: number) => {
    const { board, playerPieces, level } = getState();
    if (!board) return;
    setters.setIsLoading(true);
    const king = playerPieces.find(p => p.piece === 'King');
    const { board: newBoard, factions } = initializeBoard(level, king ? [king] : [], { width, height, numFactions });
    setters.setBoard(newBoard);
    setters.setSelectedPiece(null);
    setters.setAvailableMoves([]);
    setters.setCurrentTurn('player');
    setters.setHistory([]);
    setters.setIsLevelComplete(false);
    setters.setIsGameOver(false);
    toast({ title: t('toast.cheatActivated'), description: t('toast.levelRegenerated', { width, height, factions: factions.length }) });
    setters.setIsLoading(false);
  }

  const handleCreatePiece = (pieceType: PieceType) => {
    const { board, playerPieces, level } = getState();
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
    ].filter(p => gameActions.isWithinBoard(p.x, p.y, board) && !board[p.y][p.x]);

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
    setters.setBoard(newBoard);
    toast({ title: t('toast.cheatActivated'), description: t('toast.pieceCreated', { pieceType: t(`pieces.${pieceType}`) }) });
  }

  const handlePromotePawn = () => {
    const { board, playerPieces, level } = getState();
    if (!board) return;
    const pawns = playerPieces.filter(p => p.piece === 'Pawn');
    if (pawns.length === 0) {
        toast({ title: t('toast.cheatFailed'), description: t('toast.noPawnsToPromote'), variant: "destructive" });
        return;
    }
    const randomPawn = pawns[Math.floor(Math.random() * pawns.length)];
    const newPieceType = gameActions.getPromotionPiece(level, playerPieces);
    
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const pawnToPromote = newBoard[randomPawn.y][randomPawn.x];
    if (pawnToPromote?.type === 'piece') {
        (newBoard[randomPawn.y][randomPawn.x] as Piece) = {
            ...pawnToPromote,
            piece: newPieceType,
            direction: undefined,
        };
        setters.setBoard(newBoard);
        toast({ title: t('toast.cheatActivated'), description: t('toast.pawnPromoted', { pieceType: t(`pieces.${newPieceType}`) }) });
    }
  }

  return {
    state: getState(),
    actions: {
      handleTileClick: gameActions.handleTileClick,
      restartGame,
      handleCarryOver,
      setIsHelpOpen: setters.setIsHelpOpen,
      setIsSoundEnabled: setters.setIsSoundEnabled,
      handleRegenerateLevel,
      handleWinLevel: gameActions.handleWinLevel,
      handleCreatePiece,
      handlePromotePawn,
      handleAwardCosmetic: gameActions.handleAwardCosmetic,
    }
  }
}

    
