
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Piece, Board, Position, PieceType, HistoryEntry, AvailableMove } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/context/i18n';
import { initializeBoard, getValidMoves, isWithinBoard, isSquareAttackedBy } from '@/lib/game-logic';
import { generateRandomName } from '@/lib/names';
import { playSound, initAudioContext } from '@/lib/sounds';

const SAVE_GAME_KEY = 'chess-crawl-save-game';
const SOUND_ENABLED_KEY = 'chess-crawl-sound-enabled';

export function useGame() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const audioInitialized = useRef(false);
  const clickLock = useRef(false);

  // --- STATE MANAGEMENT ---
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<Board | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [inventory, setInventory] = useState<{ pieces: Piece[], cosmetics: string[] }>({ pieces: [], cosmetics: [] });
  const [currentTurn, setCurrentTurn] = useState('player');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [availableMoves, setAvailableMoves] = useState<AvailableMove[]>([]);
  const [isEnemyThinking, setIsEnemyThinking] = useState(false);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [debugLog, setDebugLog] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabledState] = useState(true);

  // --- PERSISTENCE ---
  const getGameState = useCallback(() => ({
    level, board, currentTurn, history, inventory,
  }), [level, board, currentTurn, history, inventory]);

  const saveGame = useCallback((data?: Partial<ReturnType<typeof getGameState>>) => {
    const stateToSave = data || getGameState();
    try {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Failed to save game state:", error);
    }
  }, [getGameState]);

  const loadGame = useCallback(() => {
    try {
        const savedGame = localStorage.getItem(SAVE_GAME_KEY);
        if (savedGame) {
            const parsedData = JSON.parse(savedGame);
            setLevel(parsedData.level);
            setBoard(parsedData.board);
            setCurrentTurn(parsedData.currentTurn);
            setHistory(parsedData.history || []);
            setInventory(parsedData.inventory || { pieces: [], cosmetics: [] });
            setIsLoading(false);
            return true;
        }
    } catch (error) {
        console.error("Failed to load saved game, starting new game.", error);
        localStorage.removeItem(SAVE_GAME_KEY);
    }
    return false;
  }, []);

  const clearSave = useCallback(() => {
    localStorage.removeItem(SAVE_GAME_KEY);
  }, []);

  // --- DERIVED STATE ---
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
    return isSquareAttackedBy({ x: playerKing.x, y: playerKing.y }, board, enemyFactions);
  }, [board, playerPieces, enemyPieces]);

  const isGameOver = useMemo(() => {
      if (isLoading || level === 0) return false;
      const playerKing = playerPieces.find(p => p.piece === 'King');
      return !playerKing || playerPieces.length === 0;
  }, [playerPieces, isLoading, level]);

  const isLevelComplete = useMemo(() => {
      if (isLoading || isGameOver || level === 0) return false;
      return enemyPieces.length === 0 && playerPieces.length > 0;
  }, [enemyPieces.length, playerPieces.length, isGameOver, isLoading, level]);


  // --- SOUND MANAGEMENT ---
  const setIsSoundEnabled = useCallback((value: boolean | ((prevState: boolean) => boolean)) => {
    setIsSoundEnabledState(prev => {
      const newState = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  useEffect(() => {
    const savedSoundSetting = localStorage.getItem(SOUND_ENABLED_KEY);
    if (savedSoundSetting !== null) {
      setIsSoundEnabledState(JSON.parse(savedSoundSetting));
    }
  }, []);

  useEffect(() => {
    if (isSoundEnabled) {
      if (isKingInCheck) playSound('check');
      if (isLevelComplete) playSound('win');
      if (isGameOver) playSound('lose');
    }
  }, [isKingInCheck, isLevelComplete, isGameOver, isSoundEnabled]);

  // --- CORE GAME LOGIC & ACTIONS ---
  const addToHistory = useCallback((entry: HistoryEntry) => {
    setHistory(prev => {
      const newHistory = [entry, ...prev].slice(0, 50);
      return newHistory;
    });
  }, []);

  const activeEnemyFactions = useCallback(() => {
    if (!board) return [];
    const factions = new Set<string>();
    board.forEach(row => row.forEach(tile => {
      if (tile?.type === 'piece' && tile.color !== 'white') {
        factions.add(tile.color);
      }
    }));
    return Array.from(factions).sort();
  }, [board]);

  const getTurnOrder = useCallback(() => ['player', ...activeEnemyFactions()], [activeEnemyFactions]);

  const advanceTurn = useCallback(() => {
    setCurrentTurn(prevTurn => {
        const turnOrder = getTurnOrder();
        const currentIndex = turnOrder.indexOf(prevTurn);
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        return turnOrder[nextIndex] || 'player';
    });
  }, [getTurnOrder]);

  const getPromotionPiece = useCallback((level: number, currentPlayerPieces: Piece[]): PieceType => {
      const promotionOptions: { piece: PieceType; baseWeight: number }[] = [
          { piece: 'Knight', baseWeight: 4 }, { piece: 'Bishop', baseWeight: 4 },
          { piece: 'Rook', baseWeight: 2 }, { piece: 'Queen', baseWeight: 1 },
      ];
      const availablePromotions = promotionOptions.filter(option => {
          if (level < 3) return ['Knight', 'Bishop'].includes(option.piece);
          if (level < 5) return ['Knight', 'Bishop', 'Rook'].includes(option.piece);
          return true;
      });
      const pieceCounts: { [key in PieceType]?: number } = {};
      currentPlayerPieces.forEach(p => {
          if (p.piece !== 'King' && p.piece !== 'Pawn') pieceCounts[p.piece] = (pieceCounts[p.piece] || 0) + 1;
      });
      const weightedPromotions = availablePromotions.map(option => ({ piece: option.piece, weight: Math.max(0.1, option.baseWeight / (1 + (pieceCounts[option.piece] || 0) * 2)) }));
      const totalWeight = weightedPromotions.reduce((sum, p) => sum + p.weight, 0);
      if (totalWeight === 0) return 'Knight';
      let random = Math.random() * totalWeight;
      for (const promotion of weightedPromotions) {
          if (random < promotion.weight) return promotion.piece;
          random -= promotion.weight;
      }
      return weightedPromotions.length > 0 ? weightedPromotions[weightedPromotions.length - 1].piece : 'Knight';
  }, []);
  
  const checkForAllyRescue = useCallback((pos: Position, currentBoard: Board, levelForRescue: number) => {
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    directions.forEach(([dx, dy]) => {
      if (isWithinBoard(pos.x + dx, pos.y + dy, currentBoard)) {
        const adjacentTile = currentBoard[pos.y + dy][pos.x + dx];
        if (adjacentTile?.type === 'sleeping_ally') {
          const newPieceType = adjacentTile.piece;
          const newPieceName = generateRandomName();
          currentBoard[pos.y + dy][pos.x + dx] = { type: 'piece', piece: newPieceType, color: 'white', x: pos.x + dx, y: pos.y + dy, id: `${pos.x + dx}-${pos.y + dy}-${Date.now()}`, name: newPieceName, discoveredOnLevel: levelForRescue, captures: 0 };
          toast({ title: t('toast.allyRescued'), description: t('toast.allyRescuedDesc', { pieceType: t(`pieces.${newPieceType}`) }) });
          addToHistory({ key: 'history.allyJoined', values: { pieceTypeKey: `pieces.${newPieceType}`, name: newPieceName } });
          checkForAllyRescue({ x: pos.x + dx, y: pos.y + dy }, currentBoard, levelForRescue);
        }
      }
    });
  }, [toast, t, addToHistory]);

  const checkForAllyRescueOnSetup = useCallback((currentBoard: Board, levelForRescue: number) => {
    currentBoard.forEach((row, y) => row.forEach((tile, x) => {
        if (tile?.type === 'piece' && tile.color === 'white') {
            checkForAllyRescue({x, y}, currentBoard, levelForRescue);
        }
    }));
  }, [checkForAllyRescue]);

  const movePiece = useCallback((from: Position, to: Position) => {
    if (!board) return;
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const pieceToMove = JSON.parse(JSON.stringify(newBoard[from.y][from.x] as Piece));
    const targetTile = newBoard[to.y][to.x] ? JSON.parse(JSON.stringify(newBoard[to.y][to.x])) : null;
    let newPieceState: Piece = { ...pieceToMove, x: to.x, y: to.y };
    let historyEntry: HistoryEntry | null = null;
    
    if (targetTile?.type === 'piece' && targetTile.color !== pieceToMove.color) {
      if (isSoundEnabled) playSound('capture');
      newPieceState.captures = (newPieceState.captures || 0) + 1;
      historyEntry = { key: 'history.playerCapture', values: { name: pieceToMove.name, pieceKey: `pieces.${pieceToMove.piece}`, factionKey: `factions.${targetTile.color}`, targetPieceKey: `pieces.${targetTile.piece}`, x: to.x + 1, y: to.y + 1 } };
    } else if (targetTile?.type === 'chest') {
      if (isSoundEnabled) playSound('move');
      const currentPlayerPieces = board.flatMap(row => row.filter(tile => tile?.type === 'piece' && tile.color === 'white')) as Piece[];
      if (pieceToMove.piece === 'Pawn') {
        const newPieceType = getPromotionPiece(level, currentPlayerPieces);
        newPieceState = { ...newPieceState, id: `${newPieceType.toLowerCase()}-${Date.now()}`, piece: newPieceType, direction: undefined };
        toast({ title: t('toast.promotion'), description: t('toast.promotionDesc', { pieceType: t(`pieces.${newPieceType}`) }) });
        historyEntry = { key: 'history.playerPromotion', values: { name: pieceToMove.name, pieceKey: `pieces.${pieceToMove.piece}`, newPieceTypeKey: `pieces.${newPieceType}` } };
      } else {
        const availableCosmetics = ['sunglasses', 'tophat', 'partyhat', 'bowtie', 'heart', 'star'];
        const newCosmetic = availableCosmetics[Math.floor(Math.random() * availableCosmetics.length)];
        const existingCosmetics = inventory.cosmetics.filter(c => c !== pieceToMove.cosmetic);
        setInventory(prev => ({...prev, cosmetics: [...existingCosmetics, newCosmetic]}));
        newPieceState.cosmetic = newCosmetic;
        toast({ title: t('toast.chestOpened'), description: t('toast.chestOpenedDesc', { piece: t(`pieces.${pieceToMove.piece}`), cosmetic: t(`cosmetics.${newCosmetic}`) }) });
        historyEntry = { key: 'history.playerCosmetic', values: { name: pieceToMove.name, pieceKey: `pieces.${pieceToMove.piece}`, cosmeticKey: `cosmetics.${newCosmetic}` } };
      }
    } else {
      if (isSoundEnabled) playSound('move');
      historyEntry = { key: 'history.playerMove', values: { name: pieceToMove.name, pieceKey: `pieces.${pieceToMove.piece}`, x: to.x + 1, y: to.y + 1 } };
    }
    if (pieceToMove.piece === 'Pawn') {
      const isOrthogonalMove = from.x === to.x || from.y === to.y;
      const currentDirection = pieceToMove.direction || 'up';
      const forwardVector = { 'up': {y: -1}, 'down': {y: 1}, 'left': {x: -1}, 'right': {x: 1} }[currentDirection] as {x?: number, y?: number};
      const isStandardForwardMove = (forwardVector.y !== undefined && to.y === from.y + forwardVector.y && from.x === to.x) || (forwardVector.x !== undefined && to.x === from.x + forwardVector.x && from.y === to.y);
      if (isOrthogonalMove && !isStandardForwardMove) {
        let newDirection = pieceToMove.direction;
        if (to.x > from.x) newDirection = 'right'; else if (to.x < from.x) newDirection = 'left';
        else if (to.y > from.y) newDirection = 'down'; else if (to.y < from.y) newDirection = 'up';
        newPieceState = {...newPieceState, direction: newDirection};
      }
    }
    if (historyEntry) addToHistory(historyEntry);
    newBoard[to.y][to.x] = newPieceState;
    newBoard[from.y][from.x] = null;
    checkForAllyRescue(to, newBoard, level);
    setBoard(newBoard);
    setSelectedPiece(null);

    setTimeout(() => {
        advanceTurn();
        setIsPlayerMoving(false);
        clickLock.current = false;
    }, 300);
  }, [board, isSoundEnabled, getPromotionPiece, level, toast, t, inventory.cosmetics, addToHistory, checkForAllyRescue, advanceTurn]);
  
  const handleTileClick = useCallback((x: number, y: number) => {
    if (!audioInitialized.current) { initAudioContext(); audioInitialized.current = true; }
    if (!board || isLevelComplete || isGameOver || isPlayerMoving || clickLock.current) return;
    const isPlayerTurn = currentTurn === 'player' && !isEnemyThinking;
    
    if (selectedPiece && availableMoves.some(move => move.x === x && move.y === y)) {
      if (isPlayerTurn) {
        setIsPlayerMoving(true);
        clickLock.current = true;
        const from = { ...selectedPiece };
        movePiece(from, { x, y });
      }
      return;
    }
    const clickedTile = board[y][x];
    if (clickedTile?.type === 'piece' && clickedTile.color === 'white') {
      if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
        setSelectedPiece(null);
      } else {
        setSelectedPiece({ x, y });
      }
    } else if(isPlayerTurn) {
      setSelectedPiece(null);
    }
  }, [board, isLevelComplete, isGameOver, isPlayerMoving, currentTurn, isEnemyThinking, selectedPiece, availableMoves, movePiece]);

  const calculateAvailableMoves = useCallback(() => {
    if (selectedPiece && board && currentTurn === 'player') {
      const piece = board[selectedPiece.y][selectedPiece.x];
      const baseMoves = getValidMoves(selectedPiece, board);
      if (piece?.type === 'piece' && piece.piece === 'King' && piece.color === 'white') {
        const enemyFactions = Array.from(new Set(enemyPieces.map(p => p.color)));
        const threatenedMoves = baseMoves.map(move => {
          const tempBoard = board.map(r => r.map(t => t ? {...t} : null));
          const kingPiece = tempBoard[selectedPiece.y][selectedPiece.x];
          if(kingPiece) { tempBoard[move.y][move.x] = kingPiece; tempBoard[selectedPiece.y][selectedPiece.x] = null; }
          const isThreatened = isSquareAttackedBy(move, tempBoard, enemyFactions);
          return { ...move, isThreatened };
        });
        setAvailableMoves(threatenedMoves);
      } else {
        setAvailableMoves(baseMoves.map(m => ({...m, isThreatened: false })));
      }
    } else {
      setAvailableMoves([]);
    }
  }, [selectedPiece, board, currentTurn, enemyPieces]);

  // --- ENEMY AI ---
  const runEnemyTurn = useCallback((factionColor: string) => {
    if (!board) return;
    setIsEnemyThinking(true);
    const currentPieces: Piece[] = [];
    board.forEach(row => row.forEach(tile => { if (tile?.type === 'piece') currentPieces.push(tile); }));
    const enemies = currentPieces.filter(p => p.color === factionColor);
    const potentialTargets = currentPieces.filter(p => p.color !== factionColor);
    if (enemies.length === 0) { setIsEnemyThinking(false); advanceTurn(); return; }
    const allPossibleMoves: { piece: Piece; move: Position; score: number }[] = [];
    const playerKing = potentialTargets.find(p => p.piece === 'King' && p.color === 'white');
    const height = board.length;
    const width = board[0].length;
    const widthCenter = (width - 1) / 2;
    const heightCenter = (height - 1) / 2;

    for (const enemy of enemies) {
      const moves = getValidMoves({x: enemy.x, y: enemy.y}, board);
      for (const move of moves) {
        let score = 0;
        const targetTile = board[move.y][move.x];
        if (targetTile?.type === 'chest') { score = -Infinity; }
        else if (targetTile?.type === 'piece' && targetTile.color !== enemy.color) {
            let captureValue = 0;
            switch (targetTile.piece) {
                case 'Queen': captureValue = 90; break; case 'Rook': captureValue = 50; break;
                case 'Bishop': captureValue = 30; break; case 'Knight': captureValue = 30; break;
                case 'Pawn': captureValue = 10; break; case 'King': captureValue = 1000; break;
            }
            if(targetTile.color === 'white') score += captureValue * 1.5; else score += captureValue;
        }
        if (playerKing) {
            const newDist = Math.abs(move.x - playerKing.x) + Math.abs(move.y - playerKing.y);
            if (newDist < Math.abs(enemy.x - playerKing.x) + Math.abs(enemy.y - playerKing.y)) score += 5;
        }
        score += ((width / 2) - Math.abs(move.x - widthCenter) + (height / 2) - Math.abs(move.y - heightCenter)) / 4; 
        if (enemy.piece === 'King') score -= 5;
        score += Math.random() * 2; 
        allPossibleMoves.push({ piece: enemy, move, score });
      }
    }
    
    if (allPossibleMoves.length === 0) { addToHistory({key: 'history.enemyNoMoves', values: { factionKey: `factions.${factionColor}`}}); setIsEnemyThinking(false); advanceTurn(); return; }
    const validMoves = allPossibleMoves.filter(move => move.score > -Infinity);
    if (validMoves.length === 0) { addToHistory({key: 'history.enemyNoMoves', values: { factionKey: `factions.${factionColor}`}}); setIsEnemyThinking(false); advanceTurn(); return; }
    validMoves.sort((a, b) => b.score - a.score);
    const bestMove = validMoves[0];
    const { piece: pieceToMove, move } = bestMove;
    const from = { x: pieceToMove.x, y: pieceToMove.y };
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const targetTile = newBoard[move.y][move.x] ? JSON.parse(JSON.stringify(newBoard[move.y][move.x])) : null;
    let newPieceState: Piece = { ...pieceToMove, x: move.x, y: move.y };
    if (targetTile?.type === 'piece' && targetTile.color !== pieceToMove.color) { if (isSoundEnabled) playSound('capture'); newPieceState.captures = (newPieceState.captures || 0) + 1; }
    else { if (isSoundEnabled) playSound('move'); }
    
    let historyEntry: HistoryEntry;
    if (targetTile?.type === 'piece') {
        if (targetTile.color === 'white') {
            const hasCosmetic = !!targetTile.cosmetic;
            historyEntry = { key: hasCosmetic ? 'history.playerPieceCaptured_cosmetic' : 'history.playerPieceCaptured', values: { name: targetTile.name, pieceKey: `pieces.${targetTile.piece}`, discoveredOnLevel: targetTile.discoveredOnLevel, captures: targetTile.captures || 0, ...(hasCosmetic && { cosmeticKey: `cosmetics.${targetTile.cosmetic}` }), factionKey: `factions.${factionColor}`, enemyPieceKey: `pieces.${newPieceState.piece}` } };
        } else {
            historyEntry = { key: 'history.enemyCapture', values: { factionKey: `factions.${factionColor}`, name: newPieceState.name, pieceKey: `pieces.${newPieceState.piece}`, x: newPieceState.x + 1, y: newPieceState.y + 1, targetFactionKey: `factions.${targetTile.color}`, targetPieceKey: `pieces.${targetTile.piece}`, } };
        }
    } else {
        historyEntry = { key: 'history.enemyMove', values: { factionKey: `factions.${factionColor}`, name: newPieceState.name, pieceKey: `pieces.${newPieceState.piece}`, x: newPieceState.x + 1, y: newPieceState.y + 1, } };
    }

    if (pieceToMove.piece === 'Pawn') {
        const isOrthogonal = from.x === move.x || from.y === move.y;
        const currentDirection = pieceToMove.direction || 'down';
        const forwardVector = { 'up': {y: -1}, 'down': {y: 1}, 'left': {x: -1}, 'right': {x: 1} }[currentDirection] as {x?: number, y?: number};
        const isStandardForwardMove = (forwardVector.y !== undefined && move.y === from.y + forwardVector.y && from.x === move.x) || (forwardVector.x !== undefined && move.x === from.x + forwardVector.x && from.y === move.y);
        if (isOrthogonal && !isStandardForwardMove) {
            let newDirection = pieceToMove.direction;
            if (move.x > from.x) newDirection = 'right'; else if (move.x < from.x) newDirection = 'left';
            else if (move.y > from.y) newDirection = 'down'; else if (move.y < from.y) newDirection = 'up';
            newPieceState = {...newPieceState, direction: newDirection};
        }
    }
    newBoard[move.y][move.x] = newPieceState;
    newBoard[from.y][from.x] = null;
    
    setTimeout(() => {
      setBoard(newBoard);
      addToHistory(historyEntry);
      setIsEnemyThinking(false);
      advanceTurn();
    }, 300);
  }, [board, isSoundEnabled, advanceTurn, addToHistory]);

  // --- LEVEL MANAGEMENT & CHEATS ---
  const setupLevel = useCallback((levelToSetup: number, piecesToCarry: Piece[]) => {
    setIsLoading(true);
    let finalPieces = piecesToCarry, isNewGame = false;
    if (levelToSetup === 1 && piecesToCarry.length === 0) {
        isNewGame = true;
        finalPieces = [
            { type: 'piece', piece: 'King', color: 'white', x: 0, y: 0, id: `wk-${Date.now()}`, name: generateRandomName(), discoveredOnLevel: 1, captures: 0 },
            { type: 'piece', piece: 'Pawn', color: 'white', x: 0, y: 0, id: `wp1-${Date.now()}`, direction: 'up', name: generateRandomName(), discoveredOnLevel: 1, captures: 0 },
            { type: 'piece', piece: 'Pawn', color: 'white', x: 0, y: 0, id: `wp2-${Date.now()}`, direction: 'up', name: generateRandomName(), discoveredOnLevel: 1, captures: 0 }
        ];
    }
    const newHistory = isNewGame ? [] : history;
    setHistory(newHistory);
    const newLevelHistoryEntry = {key: 'history.levelStart', values: { level: levelToSetup }};
    addToHistory(newLevelHistoryEntry);

    if (!isNewGame) {
      piecesToCarry.filter(p => p.piece !== 'King').forEach(piece => {
        addToHistory({ key: 'history.pieceCarriedOver', values: { name: piece.name, pieceKey: `pieces.${piece.piece}` } });
      });
    }
    
    setLevel(levelToSetup);
    const { board: newBoard } = initializeBoard(levelToSetup, finalPieces);
    checkForAllyRescueOnSetup(newBoard, levelToSetup);
    setBoard(newBoard);
    setCurrentTurn('player');
    setSelectedPiece(null);
    setInventory(prev => ({ ...prev, pieces: finalPieces }));
    setIsLoading(false);
  }, [addToHistory, checkForAllyRescueOnSetup, history]);
  
  const restartGame = useCallback(() => {
    clearSave();
    setDebugLog('');
    setSelectedPiece(null);
    setAvailableMoves([]);
    setInventory({ pieces: [], cosmetics: [] });
    setHistory([]);
    setupLevel(1, []);
  }, [setupLevel, clearSave]);
  
  const handleCarryOver = useCallback((piecesToCarry: Piece[]) => {
      const king = playerPieces.find(p => p.piece === 'King');
      const clonedCarriedPieces = piecesToCarry.map(p => ({ ...p, id: `${p.piece.toLowerCase()}-${Date.now()}-${Math.random()}` }));
      const clonedKing = king ? [{ ...king, id: `wk-${Date.now()}` }] : [];
      let finalPiecesForNextLevel = [...clonedCarriedPieces, ...clonedKing];
      if (finalPiecesForNextLevel.length <= 1 && level > 0) {
           finalPiecesForNextLevel.push({ type: 'piece', piece: 'Pawn', color: 'white', x: 0, y: 0, id: `wp-new-${level+1}-${Date.now()}`, direction: 'up', name: generateRandomName(), discoveredOnLevel: level + 1, captures: 0 });
      }
      setupLevel(level + 1, finalPiecesForNextLevel);
  }, [playerPieces, level, setupLevel]);

  const handleRegenerateLevel = useCallback((width: number, height: number, numFactions: number) => {
    if (!board) return;
    setIsLoading(true);
    const king = playerPieces.find(p => p.piece === 'King');
    const { board: newBoard, factions } = initializeBoard(level, king ? [king] : [], { width, height, numFactions });
    setBoard(newBoard);
    setSelectedPiece(null);
    setAvailableMoves([]);
    setCurrentTurn('player');
    setHistory([]);
    toast({ title: t('toast.cheatActivated'), description: t('toast.levelRegenerated', { width, height, factions: factions.length }) });
    setIsLoading(false);
  }, [board, playerPieces, level, toast, t]);

  const handleCreatePiece = useCallback((pieceType: PieceType) => {
    if (!board) return;
    const king = playerPieces.find(p => p.piece === 'King');
    if (!king) { toast({ title: t('toast.cheatFailed'), description: t('toast.kingNotFound'), variant: "destructive" }); return; }
    const { x: kingX, y: kingY } = king;
    const possibleSpawns: {x: number, y: number}[] = [
        { x: kingX - 1, y: kingY }, { x: kingX + 1, y: kingY }, { x: kingX, y: kingY - 1 }, { x: kingX, y: kingY + 1 },
        { x: kingX - 1, y: kingY - 1 }, { x: kingX + 1, y: kingY - 1 }, { x: kingX - 1, y: kingY + 1 }, { x: kingX + 1, y: kingY + 1 },
    ].filter(p => isWithinBoard(p.x, p.y, board) && !board[p.y][p.x]);
    if (possibleSpawns.length === 0) { toast({ title: t('toast.cheatFailed'), description: t('toast.noEmptySpace'), variant: "destructive" }); return; }
    const spawnPos = possibleSpawns[0];
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    newBoard[spawnPos.y][spawnPos.x] = { type: 'piece', piece: pieceType, color: 'white', x: spawnPos.x, y: spawnPos.y, id: `${pieceType}-${Date.now()}`, name: generateRandomName(), discoveredOnLevel: level, captures: 0 };
    setBoard(newBoard);
    toast({ title: t('toast.cheatActivated'), description: t('toast.pieceCreated', { pieceType: t(`pieces.${pieceType}`) }) });
  }, [board, playerPieces, level, toast, t]);

  const handlePromotePawn = useCallback(() => {
    if (!board) return;
    const pawns = playerPieces.filter(p => p.piece === 'Pawn');
    if (pawns.length === 0) { toast({ title: t('toast.cheatFailed'), description: t('toast.noPawnsToPromote'), variant: "destructive" }); return; }
    const randomPawn = pawns[Math.floor(Math.random() * pawns.length)];
    const newPieceType = getPromotionPiece(level, playerPieces);
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const pawnToPromote = newBoard[randomPawn.y][randomPawn.x];
    if (pawnToPromote?.type === 'piece') {
        (newBoard[randomPawn.y][randomPawn.x] as Piece) = { ...pawnToPromote, piece: newPieceType, direction: undefined };
        setBoard(newBoard);
        toast({ title: t('toast.cheatActivated'), description: t('toast.pawnPromoted', { pieceType: t(`pieces.${newPieceType}`) }) });
    }
  }, [board, playerPieces, level, getPromotionPiece, toast, t]);

  const handleWinLevel = useCallback(() => {
    setBoard(board => board?.map(row => row.map(tile => (tile?.type === 'piece' && tile.color !== 'white') ? null : tile)) || null);
    toast({ title: t('toast.cheatActivated'), description: t('toast.levelWon') });
  }, [toast, t]);

  const handleAwardCosmetic = useCallback(() => {
    if (!board) return;
    const nonPawns = playerPieces.filter(p => p.piece !== 'Pawn');
    if (nonPawns.length === 0) { toast({ title: t('toast.cheatFailed'), description: t('toast.noPiecesToDecorate'), variant: "destructive" }); return; }
    const randomPiece = nonPawns[Math.floor(Math.random() * nonPawns.length)];
    const availableCosmetics = ['sunglasses', 'tophat', 'partyhat', 'bowtie', 'heart', 'star'];
    const newCosmetic = availableCosmetics[Math.floor(Math.random() * availableCosmetics.length)];
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const pieceToDecorate = newBoard[randomPiece.y][randomPiece.x];
    if(pieceToDecorate?.type === 'piece') {
        (newBoard[randomPiece.y][randomPiece.x] as Piece).cosmetic = newCosmetic;
        setBoard(newBoard);
        toast({ title: t('toast.cheatActivated'), description: t('toast.cosmeticAwarded', { piece: t(`pieces.${pieceToDecorate.piece}`), cosmetic: t(`cosmetics.${newCosmetic}`) }) });
    }
  }, [board, playerPieces, toast, t]);

  // --- LIFECYCLE & EFFECT HOOKS ---
  useEffect(() => {
    if (!loadGame()) {
      setupLevel(1, []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentTurn !== 'player' && !isEnemyThinking && !isGameOver && !isLevelComplete) {
      runEnemyTurn(currentTurn);
    }
  }, [currentTurn, isEnemyThinking, isGameOver, isLevelComplete, runEnemyTurn]);
  
  useEffect(() => {
    calculateAvailableMoves();
  }, [calculateAvailableMoves]);

  useEffect(() => {
    if (!isLoading) {
      saveGame();
    }
  }, [board, currentTurn, level, history, inventory, isLoading, saveGame]);

  return {
    state: {
      level, board, selectedPiece, availableMoves, playerPieces, enemyPieces,
      inventory, history, isLevelComplete, isGameOver, isLoading, isEnemyThinking,
      isKingInCheck, debugLog, currentTurn, isHelpOpen, isSoundEnabled
    },
    actions: {
      handleTileClick, restartGame, handleCarryOver, setIsHelpOpen, setIsSoundEnabled,
      handleRegenerateLevel, handleWinLevel, handleCreatePiece, handlePromotePawn,
      handleAwardCosmetic
    }
  };
}
