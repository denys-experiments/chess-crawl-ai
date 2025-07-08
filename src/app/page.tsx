
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Piece, Board, Position, PieceType, Tile, AvailableMove } from '@/types';
import { GameBoard } from '@/components/game/board';
import { GameHud } from '@/components/game/hud';
import { initializeBoard, getValidMoves, isWithinBoard, isSquareAttackedBy } from '@/lib/game-logic';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GamePiece } from '@/components/game/piece';
import { Loader2 } from 'lucide-react';
import { generateRandomName } from '@/lib/names';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/context/i18n';

const SAVE_GAME_KEY = 'chess-crawl-save-game';

function getPromotionPiece(level: number, playerPieces: Piece[]): PieceType {
    const promotionOptions: { piece: PieceType; baseWeight: number }[] = [
        { piece: 'Knight', baseWeight: 4 },
        { piece: 'Bishop', baseWeight: 4 },
        { piece: 'Rook', baseWeight: 2 },
        { piece: 'Queen', baseWeight: 1 },
    ];

    const availablePromotions = promotionOptions.filter(option => {
        if (level < 3) return ['Knight', 'Bishop'].includes(option.piece);
        if (level < 5) return ['Knight', 'Bishop', 'Rook'].includes(option.piece);
        return true;
    });

    const pieceCounts: { [key in PieceType]?: number } = {};
    playerPieces.forEach(p => {
        if (p.piece !== 'King' && p.piece !== 'Pawn') {
            pieceCounts[p.piece] = (pieceCounts[p.piece] || 0) + 1;
        }
    });

    const weightedPromotions: { piece: PieceType; weight: number }[] = availablePromotions.map(option => {
        const count = pieceCounts[option.piece] || 0;
        const weight = Math.max(0.1, option.baseWeight / (1 + count * 2));
        return { piece: option.piece, weight };
    });

    const totalWeight = weightedPromotions.reduce((sum, p) => sum + p.weight, 0);
    if (totalWeight === 0) {
        return 'Knight';
    }
    let random = Math.random() * totalWeight;

    for (const promotion of weightedPromotions) {
        if (random < promotion.weight) {
            return promotion.piece;
        }
        random -= promotion.weight;
    }
    
    return weightedPromotions.length > 0 ? weightedPromotions[weightedPromotions.length - 1].piece : 'Knight';
}


export default function Home() {
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<Board | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [availableMoves, setAvailableMoves] = useState<AvailableMove[]>([]);
  const [playerPieces, setPlayerPieces] = useState<Piece[]>([]);
  const [enemyPieces, setEnemyPieces] = useState<Piece[]>([]);
  const [inventory, setInventory] = useState<{ pieces: Piece[], cosmetics: string[] }>({ pieces: [], cosmetics: [] });
  const [history, setHistory] = useState<string[]>([]);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnemyThinking, setIsEnemyThinking] = useState(false);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [isKingInCheck, setIsKingInCheck] = useState(false);
  const [debugLog, setDebugLog] = useState('');
  const clickLock = useRef(false);
  const [currentTurn, setCurrentTurn] = useState('player');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const { toast } = useToast();
  const { t } = useTranslation();

  const getPieceDisplayName = useCallback((name: Piece['name']) => {
    if (typeof name === 'string') {
        return name; // For backward compatibility with old saves
    }
    if (name) {
        const firstName = t(`nameParts.firstNames.${name.firstNameIndex}`);
        const lastName = t(`nameParts.lastNames.${name.lastNameIndex}`);
        return `${firstName} ${lastName}`;
    }
    return t('pieces.Unnamed');
  }, [t]);
  
  const appendToDebugLog = useCallback((message: string) => {
    setDebugLog(prev => `${prev}\n\n${message}`.trim());
  }, []);

  const addToHistory = useCallback((message: string) => {
    setHistory(prev => [message, ...prev].slice(0, 50));
  }, []);

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
    
    setLevel(levelToSetup);
    
    const { board: newBoard } = initializeBoard(levelToSetup, finalPieces);
    
    const checkForAllyRescueOnSetup = (pos: Position, currentBoard: Board) => {
      const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      directions.forEach(([dx, dy]) => {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (isWithinBoard(nx, ny, currentBoard)) {
          const adjacentTile = currentBoard[ny][nx];
          if (adjacentTile?.type === 'sleeping_ally') {
            const newPieceType = adjacentTile.piece;
            const newPieceName = generateRandomName();
            currentBoard[ny][nx] = {
              type: 'piece',
              piece: newPieceType,
              color: 'white',
              x: nx,
              y: ny,
              id: `${nx}-${ny}-${Date.now()}`,
              name: newPieceName,
              discoveredOnLevel: levelToSetup,
              captures: 0,
            };
            const displayName = getPieceDisplayName(newPieceName);
            addToHistory(t('history.allyJoined', { pieceType: t(`pieces.${newPieceType}`), name: displayName }));
            checkForAllyRescueOnSetup({ x: nx, y: ny }, currentBoard, levelToSetup);
          }
        }
      });
    };
    
    newBoard.forEach((row, y) => row.forEach((tile, x) => {
        if (tile?.type === 'piece' && tile.color === 'white') {
            checkForAllyRescueOnSetup({x, y}, newBoard);
        }
    }));
    
    setBoard(newBoard);
    setCurrentTurn('player');
    if (isNewGame) {
      setHistory([]);
    }
    setIsLevelComplete(false);
    setSelectedPiece(null);

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
  }, [appendToDebugLog, addToHistory, t, getPieceDisplayName]);
  
  useEffect(() => {
    const savedGame = localStorage.getItem(SAVE_GAME_KEY);
    if (savedGame) {
        try {
            const parsedData = JSON.parse(savedGame);
            setLevel(parsedData.level);
            setBoard(parsedData.board);
            setCurrentTurn(parsedData.currentTurn);
            setHistory(parsedData.history || []);
            setInventory(parsedData.inventory || { pieces: [], cosmetics: [] });
            setIsLoading(false);
        } catch (error) {
            console.error("Failed to load saved game, starting new game.", error);
            localStorage.removeItem(SAVE_GAME_KEY);
            setupLevel(1, []);
        }
    } else {
        setupLevel(1, []);
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
  }, [board, currentTurn, history, level, inventory, isLoading, isGameOver, isLevelComplete]);


  useEffect(() => {
    if (!board) return;

    const newPlayerPieces: Piece[] = [];
    const newEnemyPieces: Piece[] = [];
    let pieceCounts: { [key in PieceType]?: number } = {};

    board.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (tile?.type === 'piece') {
          if (tile.color === 'white') {
            newPlayerPieces.push(tile);
            if (tile.piece !== 'King' && tile.piece !== 'Pawn') {
                pieceCounts[tile.piece] = (pieceCounts[tile.piece] || 0) + 1;
            }
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
        const inCheck = isSquareAttackedBy({ x: playerKing.x, y: playerKing.y }, board, enemyFactions);
        setIsKingInCheck(inCheck);
    } else {
        setIsKingInCheck(false);
    }

    if (level > 0 && !isLoading) {
      if (newEnemyPieces.length === 0 && newPlayerPieces.length > 0) {
        setIsLevelComplete(true);
      } else if (newPlayerPieces.length === 0 || !newPlayerPieces.some(p => p.piece === 'King')) {
        setIsGameOver(true);
        localStorage.removeItem(SAVE_GAME_KEY);
      }
    }
  }, [board, level, isLoading]);
  
  const activeEnemyFactions = useMemo(() => {
    if (!board) return [];
    const factions = new Set<string>();
    board.forEach(row => row.forEach(tile => {
      if (tile?.type === 'piece' && tile.color !== 'white') {
        factions.add(tile.color);
      }
    }));
    return Array.from(factions).sort();
  }, [board]);
  
  const turnOrder = useMemo(() => ['player', ...activeEnemyFactions], [activeEnemyFactions]);

  const advanceTurn = useCallback(() => {
    setCurrentTurn(prevTurn => {
      const currentIndex = turnOrder.indexOf(prevTurn);
      const nextIndex = (currentIndex + 1) % turnOrder.length;
      return turnOrder[nextIndex];
    });
  }, [turnOrder]);
  
  const checkForAllyRescue = useCallback((pos: Position, currentBoard: Board, levelForRescue: number) => {
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    
    directions.forEach(([dx, dy]) => {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (isWithinBoard(nx, ny, currentBoard)) {
        const adjacentTile = currentBoard[ny][nx];
        if (adjacentTile?.type === 'sleeping_ally') {
          const newPieceType = adjacentTile.piece;
          const newPieceName = generateRandomName();
          currentBoard[ny][nx] = {
            type: 'piece',
            piece: newPieceType,
            color: 'white',
            x: nx,
            y: ny,
            id: `${nx}-${ny}-${Date.now()}`,
            name: newPieceName,
            discoveredOnLevel: levelForRescue,
            captures: 0,
          };
          toast({ title: t('toast.allyRescued'), description: t('toast.allyRescuedDesc', { pieceType: t(`pieces.${newPieceType}`) }) });
          const displayName = getPieceDisplayName(newPieceName);
          addToHistory(t('history.allyJoined', { pieceType: t(`pieces.${newPieceType}`), name: displayName }));
          checkForAllyRescue({ x: nx, y: ny }, currentBoard, levelForRescue);
        }
      }
    });
  }, [toast, addToHistory, t, getPieceDisplayName]);

  useEffect(() => {
    if (selectedPiece && board && currentTurn === 'player') {
      const piece = board[selectedPiece.y][selectedPiece.x];
      const baseMoves = getValidMoves(selectedPiece, board);

      if (piece?.type === 'piece' && piece.piece === 'King' && piece.color === 'white') {
          const enemyFactions = Array.from(new Set(enemyPieces.map(p => p.color)));
          
          const threatenedMoves = baseMoves.map(move => {
              const tempBoard = board.map(r => r.map(t => t ? {...t} : null));
              const kingPiece = tempBoard[selectedPiece.y][selectedPiece.x];
              if(kingPiece) {
                  tempBoard[move.y][move.x] = kingPiece;
                  tempBoard[selectedPiece.y][selectedPiece.x] = null;
              }
              const isThreatened = isSquareAttackedBy(move, tempBoard, enemyFactions);
              return { ...move, isThreatened };
          });
          setAvailableMoves(threatenedMoves);
      } else {
        setAvailableMoves(baseMoves.map(m => ({...m, isThreatened: false })));
      }
    } else if (currentTurn !== 'player') {
      // Do nothing, keep selection
    }
    else {
      setAvailableMoves([]);
    }
  }, [selectedPiece, board, currentTurn, enemyPieces]);

  const movePiece = useCallback((from: Position, to: Position, onComplete: () => void) => {
    if (!board) return;
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const pieceToMove = JSON.parse(JSON.stringify(newBoard[from.y][from.x] as Piece));
    const targetTile = newBoard[to.y][to.x] ? JSON.parse(JSON.stringify(newBoard[to.y][to.x])) : null;

    let newPieceState: Piece = {
        ...pieceToMove,
        x: to.x,
        y: to.y,
    };
    
    let eventMessage = '';
    const pieceDisplayName = getPieceDisplayName(pieceToMove.name);
    
    if (targetTile?.type === 'piece' && targetTile.color !== pieceToMove.color) {
        newPieceState.captures = (newPieceState.captures || 0) + 1;
        eventMessage = t('history.playerCapture', {
            name: pieceDisplayName,
            piece: t(`pieces.${pieceToMove.piece}`),
            color: targetTile.color,
            targetPiece: t(`pieces.${targetTile.piece}`),
            x: to.x + 1,
            y: to.y + 1
        });
    } else if (targetTile?.type === 'chest') {
      const currentPlayerPieces = board.flatMap(row => row.filter(tile => tile?.type === 'piece' && tile.color === 'white')) as Piece[];
      if (pieceToMove.piece === 'Pawn') {
        const newPieceType = getPromotionPiece(level, currentPlayerPieces);
        newPieceState = {
          ...newPieceState,
          id: `${newPieceType.toLowerCase()}-${Date.now()}`,
          piece: newPieceType,
          direction: undefined,
        };
        toast({ title: t('toast.promotion'), description: t('toast.promotionDesc', { pieceType: t(`pieces.${newPieceType}`) }) });
        eventMessage = t('history.playerPromotion', { name: pieceDisplayName, piece: t(`pieces.${pieceToMove.piece}`), newPieceType: t(`pieces.${newPieceType}`) });
      } else {
        const availableCosmetics = ['sunglasses', 'tophat', 'partyhat', 'bowtie', 'heart', 'star'];
        const newCosmetic = availableCosmetics[Math.floor(Math.random() * availableCosmetics.length)];
        
        const existingCosmetics = inventory.cosmetics.filter(c => c !== pieceToMove.cosmetic);
        setInventory(prev => ({...prev, cosmetics: [...existingCosmetics, newCosmetic]}));
        
        newPieceState.cosmetic = newCosmetic;
        const cosmeticName = t(`cosmetics.${newCosmetic}`);
        toast({ title: t('toast.chestOpened'), description: t('toast.chestOpenedDesc', { piece: t(`pieces.${pieceToMove.piece}`), cosmetic: cosmeticName}) });
        eventMessage = t('history.playerCosmetic', { name: pieceDisplayName, piece: t(`pieces.${pieceToMove.piece}`), cosmetic: cosmeticName });
      }
    } else {
        eventMessage = t('history.playerMove', { name: pieceDisplayName, piece: t(`pieces.${pieceToMove.piece}`), x: to.x + 1, y: to.y + 1 });
    }

    if (pieceToMove.piece === 'Pawn') {
        const isOrthogonalMove = from.x === to.x || from.y === to.y;
        
        const currentDirection = pieceToMove.direction || (pieceToMove.color === 'white' ? 'up' : 'down');
        const forwardVector = { 'up': {y: -1}, 'down': {y: 1}, 'left': {x: -1}, 'right': {x: 1} }[currentDirection] as {x?: number, y?: number};
        
        const isStandardForwardMove = 
            (forwardVector.y !== undefined && to.y === from.y + forwardVector.y && from.x === to.x) || 
            (forwardVector.x !== undefined && to.x === from.x + forwardVector.x && from.y === to.y);

        if (isOrthogonalMove && !isStandardForwardMove) {
             let newDirection = pieceToMove.direction;
             if (to.x > from.x) newDirection = 'right';
             else if (to.x < from.x) newDirection = 'left';
             else if (to.y > from.y) newDirection = 'down';
             else if (to.y < from.y) newDirection = 'up';
             newPieceState = {...newPieceState, direction: newDirection};
        }
    }

    if (eventMessage) {
        addToHistory(eventMessage);
    }
    newBoard[to.y][to.x] = newPieceState;
    newBoard[from.y][from.x] = null;
    
    checkForAllyRescue(to, newBoard, level);

    setBoard(newBoard);
    setSelectedPiece(null);
    
    setTimeout(() => {
        advanceTurn();
        onComplete();
    }, 300);
  }, [board, checkForAllyRescue, inventory.cosmetics, level, toast, advanceTurn, addToHistory, t, getPieceDisplayName]);

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!board || isLevelComplete || isGameOver || isPlayerMoving || clickLock.current) return;

    const isPlayerTurn = currentTurn === 'player' && !isEnemyThinking;

    if (selectedPiece && availableMoves.some(move => move.x === x && move.y === y)) {
      if (isPlayerTurn) {
        setIsPlayerMoving(true);
        clickLock.current = true;
        
        const from = { ...selectedPiece };
        setSelectedPiece(null);
        
        movePiece(from, { x, y }, () => {
          setIsPlayerMoving(false);
          clickLock.current = false;
        });
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
      return;
    }

    if(isPlayerTurn) {
        setSelectedPiece(null);
    }
  }, [availableMoves, board, currentTurn, isEnemyThinking, isGameOver, isLevelComplete, movePiece, selectedPiece, isPlayerMoving]);
  
  const finishEnemyTurn = useCallback((factionColor: string, movedPiece: Piece, targetTile: Tile | null) => {
    const movedPieceName = getPieceDisplayName(movedPiece.name);
    let reasoning = '';
    if (targetTile?.type === 'piece') {
        reasoning = t('history.enemyCapture', {
            faction: t(`factions.${factionColor}`),
            name: movedPieceName,
            piece: t(`pieces.${movedPiece.piece}`),
            x: movedPiece.x + 1,
            y: movedPiece.y + 1,
            targetColor: targetTile.color,
            targetPiece: t(`pieces.${targetTile.piece}`),
        });
    } else {
        reasoning = t('history.enemyMove', {
            faction: t(`factions.${factionColor}`),
            name: movedPieceName,
            piece: t(`pieces.${movedPiece.piece}`),
            x: movedPiece.x + 1,
            y: movedPiece.y + 1
        });
    }
    
    addToHistory(reasoning);
    setIsEnemyThinking(false);
    advanceTurn();
  }, [advanceTurn, addToHistory, t, getPieceDisplayName]);

  const runEnemyTurn = useCallback((factionColor: string) => {
    if (!board) return;
    setIsEnemyThinking(true);

    const currentPieces: Piece[] = [];
    board.forEach(row => row.forEach(tile => {
        if (tile?.type === 'piece') {
            currentPieces.push(tile);
        }
    }));
    const enemies = currentPieces.filter(p => p.color === factionColor);
    const potentialTargets = currentPieces.filter(p => p.color !== factionColor);

    if (enemies.length === 0) {
      setIsEnemyThinking(false);
      advanceTurn();
      return;
    }

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

            if (targetTile?.type === 'piece' && targetTile.color !== enemy.color) {
                let captureValue = 0;
                switch (targetTile.piece) {
                    case 'Queen': captureValue = 90; break;
                    case 'Rook': captureValue = 50; break;
                    case 'Bishop': captureValue = 30; break;
                    case 'Knight': captureValue = 30; break;
                    case 'Pawn': captureValue = 10; break;
                    case 'King': captureValue = 1000; break;
                }
                
                if(targetTile.color === 'white'){
                    score += captureValue * 1.5;
                } else {
                    score += captureValue;
                }
            } else if (targetTile?.type === 'chest') {
                 // Enemies avoid chests for now
                score -= 50;
            }
            
            if (playerKing) {
                const currentDist = Math.abs(enemy.x - playerKing.x) + Math.abs(enemy.y - playerKing.y);
                const newDist = Math.abs(move.x - playerKing.x) + Math.abs(move.y - playerKing.y);
                if (newDist < currentDist) {
                    score += 5;
                }
            } else if (potentialTargets.length > 0) {
                 const closestPlayer = [...potentialTargets].filter(p=>p.color === 'white').sort((a,b) => (Math.abs(enemy.x - a.x) + Math.abs(enemy.y - a.y)) - (Math.abs(enemy.x - b.x) + Math.abs(enemy.y - b.y)))[0];
                 if(closestPlayer) {
                     const currentDist = Math.abs(enemy.x - closestPlayer.x) + Math.abs(enemy.y - closestPlayer.y);
                     const newDist = Math.abs(move.x - closestPlayer.x) + Math.abs(move.y - closestPlayer.y);
                     if (newDist < currentDist) {
                         score += 2;
                     }
                 }
            }
            
            const centralityX = (width / 2) - Math.abs(move.x - widthCenter);
            const centralityY = (height / 2) - Math.abs(move.y - heightCenter);
            score += (centralityX + centralityY) / 4; 

            if (enemy.piece === 'King') {
                score -= 5;
            }
            
            score += Math.random() * 2; // Increased randomness to avoid loops

            allPossibleMoves.push({ piece: enemy, move, score });
        }
    }
    
    if (allPossibleMoves.length === 0) {
        addToHistory(t('history.enemyNoMoves', { faction: t(`factions.${factionColor}`) }));
        setIsEnemyThinking(false);
        advanceTurn();
        return;
    }

    allPossibleMoves.sort((a, b) => b.score - a.score);
    const bestMove = allPossibleMoves[0];

    const { piece: pieceToMove, move } = bestMove;
    const from = { x: pieceToMove.x, y: pieceToMove.y };
    
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const targetTile = newBoard[move.y][move.x] ? JSON.parse(JSON.stringify(newBoard[move.y][move.x])) : null;
    
    let newPieceState: Piece = { ...pieceToMove, x: move.x, y: move.y };
    
    if (targetTile?.type === 'piece' && targetTile.color !== pieceToMove.color) {
        newPieceState.captures = (newPieceState.captures || 0) + 1;
    }

    if (pieceToMove.piece === 'Pawn') {
        const isOrthogonal = from.x === move.x || from.y === move.y;
        const currentDirection = pieceToMove.direction || (pieceToMove.color === 'white' ? 'up' : 'down');
        const forwardVector = { 'up': {y: -1}, 'down': {y: 1}, 'left': {x: -1}, 'right': {x: 1} }[currentDirection] as {x?: number, y?: number};
        
        const isStandardForwardMove = 
            (forwardVector.y !== undefined && move.y === from.y + forwardVector.y && from.x === move.x) || 
            (forwardVector.x !== undefined && move.x === from.x + forwardVector.x && from.y === move.y);
        
        if (isOrthogonal && !isStandardForwardMove) {
            let newDirection = pieceToMove.direction;
            if (move.x > from.x) newDirection = 'right';
            else if (move.x < from.x) newDirection = 'left';
            else if (move.y > from.y) newDirection = 'down';
            else if (move.y < from.y) newDirection = 'up';
            newPieceState = {...newPieceState, direction: newDirection};
        }
    }

    newBoard[move.y][move.x] = newPieceState;
    newBoard[from.y][from.x] = null;
    
    setBoard(newBoard);

    setTimeout(() => {
        finishEnemyTurn(factionColor, newPieceState, targetTile);
    }, 300);
  }, [board, advanceTurn, finishEnemyTurn, addToHistory, t]);


  useEffect(() => {
    if (currentTurn !== 'player' && !isEnemyThinking && !isGameOver && !isLevelComplete) {
      runEnemyTurn(currentTurn);
    }
  }, [currentTurn, isEnemyThinking, runEnemyTurn, isGameOver, isLevelComplete]);
  
  const restartGame = () => {
    localStorage.removeItem(SAVE_GAME_KEY);
    setIsLoading(true);
    setDebugLog('');
    setSelectedPiece(null);
    setAvailableMoves([]);
    setInventory({ pieces: [], cosmetics: [] });
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
      
      setInventory(prev => ({...prev, pieces: finalPiecesForNextLevel}));
      setupLevel(level + 1, finalPiecesForNextLevel);
  };

  const selectedPieceData = useMemo(() => {
    if (selectedPiece && board) {
        const tile = board[selectedPiece.y][selectedPiece.x];
        if (tile?.type === 'piece' && tile.color === 'white') {
            return tile;
        }
    }
    return null;
  }, [selectedPiece, board]);

  // --- CHEAT FUNCTIONS ---

  const handleRegenerateLevel = (width: number, height: number, numFactions: number) => {
    if (!board) return;
    setIsLoading(true);
    const king = playerPieces.find(p => p.piece === 'King');
    const { board: newBoard, factions } = initializeBoard(level, king ? [king] : [], { width, height, numFactions });
    setBoard(newBoard);
    setSelectedPiece(null);
    setAvailableMoves([]);
    setCurrentTurn('player');
    setHistory([]);
    setIsLevelComplete(false);
    setIsGameOver(false);
    toast({ title: t('toast.cheatActivated'), description: t('toast.levelRegenerated', { width, height, factions: factions.length }) });
  }

  const handleWinLevel = () => {
    setIsLevelComplete(true);
    toast({ title: t('toast.cheatActivated'), description: t('toast.levelWon') });
  }

  const handleCreatePiece = (pieceType: PieceType) => {
    if (!board) return;
    const king = playerPieces.find(p => p.piece === 'King');
    if (!king) {
        toast({ title: t('toast.cheatFailed'), description: t('toast.kingNotFound'), variant: "destructive" });
        return;
    }
    const { x: kingX, y: kingY } = king;
    const possibleSpawns: Position[] = [
        { x: kingX - 1, y: kingY }, { x: kingX + 1, y: kingY },
        { x: kingX, y: kingY - 1 }, { x: kingX, y: kingY + 1 },
        { x: kingX - 1, y: kingY - 1 }, { x: kingX + 1, y: kingY - 1 },
        { x: kingX - 1, y: kingY + 1 }, { x: kingX + 1, y: kingY + 1 },
    ].filter(p => isWithinBoard(p.x, p.y, board) && !board[p.y][p.x]);

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
    const newPieceType = getPromotionPiece(level, playerPieces);
    
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

  const handleAwardCosmetic = () => {
    if (!board) return;
    const nonPawns = playerPieces.filter(p => p.piece !== 'Pawn');
    if (nonPawns.length === 0) {
        toast({ title: t('toast.cheatFailed'), description: t('toast.noPiecesToDecorate'), variant: "destructive" });
        return;
    }
    const randomPiece = nonPawns[Math.floor(Math.random() * nonPawns.length)];

    const availableCosmetics = ['sunglasses', 'tophat', 'partyhat', 'bowtie', 'heart', 'star'];
    const newCosmetic = availableCosmetics[Math.floor(Math.random() * availableCosmetics.length)];
    const cosmeticName = t(`cosmetics.${newCosmetic}`);

    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const pieceToDecorate = newBoard[randomPiece.y][randomPiece.x];
    if(pieceToDecorate?.type === 'piece') {
        (newBoard[randomPiece.y][randomPiece.x] as Piece).cosmetic = newCosmetic;
        setBoard(newBoard);
        toast({ title: t('toast.cheatActivated'), description: t('toast.cosmeticAwarded', { piece: t(`pieces.${pieceToDecorate.piece}`), cosmetic: cosmeticName }) });
    }
  }

  if (isLoading || !board) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
        <div className="flex-grow flex items-center justify-center">
          <GameBoard
            board={board}
            onTileClick={handleTileClick}
            selectedPiece={selectedPiece}
            availableMoves={availableMoves}
            isLoading={isLoading}
            isKingInCheck={isKingInCheck}
          />
        </div>
        <GameHud 
          currentTurn={currentTurn}
          level={level}
          inventory={inventory}
          history={history}
          isEnemyThinking={isEnemyThinking}
          selectedPiece={selectedPieceData}
          onRegenerateLevel={handleRegenerateLevel}
          onWinLevel={handleWinLevel}
          onCreatePiece={handleCreatePiece}
          onPromotePawn={handlePromotePawn}
          onAwardCosmetic={handleAwardCosmetic}
          onRestart={restartGame}
          debugLog={debugLog}
          onShowHelp={() => setIsHelpOpen(true)}
        />
      </div>
      <LevelCompleteDialog 
        isOpen={isLevelComplete}
        level={level}
        playerPieces={playerPieces}
        onNextLevel={handleCarryOver}
        getPieceDisplayName={getPieceDisplayName}
      />
      <GameOverDialog 
        isOpen={isGameOver}
        onRestart={restartGame}
      />
      <HowToPlayDialog
        isOpen={isHelpOpen}
        onOpenChange={setIsHelpOpen}
      />
    </main>
  );
}

function LevelCompleteDialog({ isOpen, level, playerPieces, onNextLevel, getPieceDisplayName }: { isOpen: boolean; level: number; playerPieces: Piece[]; onNextLevel: (pieces: Piece[]) => void; getPieceDisplayName: (name: Piece['name']) => string; }) {
    const [selectedPieces, setSelectedPieces] = useState<Piece[]>([]);
    const { t } = useTranslation();
    const maxCarryOver = Math.floor(level / 2) + 1;
    const selectablePieces = playerPieces.filter(p => p.piece !== 'King');

    useEffect(() => {
        if (isOpen) {
            setSelectedPieces([]);
        }
    }, [isOpen]);

    const togglePieceSelection = (piece: Piece) => {
        setSelectedPieces(prev => {
            if(prev.find(p => p.id === piece.id)) {
                return prev.filter(p => p.id !== piece.id);
            }
            if(prev.length < maxCarryOver) {
                return [...prev, piece];
            }
            return prev;
        });
    };

    const handleConfirm = () => {
        onNextLevel(selectedPieces);
    }

    return (
        <Dialog open={isOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('levelCompleteDialog.title', { level })}</DialogTitle>
                    <DialogDescription>
                        {t('levelCompleteDialog.description', { maxCarryOver })}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[40vh] pr-6">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4">
                        {selectablePieces.map(piece => (
                            <div key={piece.id} onClick={() => togglePieceSelection(piece)} className={`p-2 border-2 rounded-lg cursor-pointer flex flex-col items-center justify-center text-center transition-all ${selectedPieces.find(p => p.id === piece.id) ? 'border-primary bg-primary/20' : 'border-transparent hover:border-border'}`}>
                                 <GamePiece piece={piece} size="sm" />
                                 <span className="text-xs font-medium mt-1.5 leading-tight">{getPieceDisplayName(piece.name)}</span>
                                 <span className="text-xs text-muted-foreground">({t(`pieces.${piece.piece}`)})</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={selectedPieces.length > maxCarryOver}>
                       {t('levelCompleteDialog.button', { levelPlus1: level + 1, selected: selectedPieces.length, max: maxCarryOver })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GameOverDialog({ isOpen, onRestart }: { isOpen: boolean; onRestart: () => void; }) {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('gameOverDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('gameOverDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onRestart}>{t('gameOverDialog.button')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HowToPlayDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (isOpen: boolean) => void; }) {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('howToPlayDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('howToPlayDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-6">
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-headline text-lg mb-2 text-primary">{t('howToPlayDialog.goalTitle')}</h3>
              <p>
                {t('howToPlayDialog.goalText')}
              </p>
            </div>
            
            <Separator />

            <div>
              <h3 className="font-headline text-lg mb-2 text-primary">{t('howToPlayDialog.yourTurnTitle')}</h3>
              <div className="grid md:grid-cols-2 gap-4 items-center">
                <p>
                  {t('howToPlayDialog.yourTurnText')}
                </p>
                <Image src="https://placehold.co/400x250.png" alt="Selecting a piece and its available moves" width={400} height={250} className="rounded-md" data-ai-hint="game board" />
              </div>
            </div>

            <Separator />
            
            <div>
                <h3 className="font-headline text-lg mb-2 text-primary">{t('howToPlayDialog.boardObjectsTitle')}</h3>
                <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                         <div>
                            <h4 className="font-semibold mb-1">{t('howToPlayDialog.sleepingAlliesTitle')}</h4>
                            <p>{t('howToPlayDialog.sleepingAlliesText')}</p>
                        </div>
                        <Image src="https://placehold.co/400x250.png" alt="A player piece next to a sleeping ally" width={400} height={250} className="rounded-md" data-ai-hint="chess piece" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                        <div>
                            <h4 className="font-semibold mb-1">{t('howToPlayDialog.chestsTitle')}</h4>
                            <p>{t('howToPlayDialog.chestsText')}</p>
                        </div>
                         <Image src="https://placehold.co/400x250.png" alt="A piece opening a chest" width={400} height={250} className="rounded-md" data-ai-hint="treasure chest" />
                    </div>
                     <div className="grid md:grid-cols-2 gap-4 items-center">
                         <div>
                            <h4 className="font-semibold mb-1">{t('howToPlayDialog.wallsTitle')}</h4>
                            <p>{t('howToPlayDialog.wallsText')}</p>
                        </div>
                        <Image src="https://placehold.co/400x250.png" alt="Walls on the game board" width={400} height={250} className="rounded-md" data-ai-hint="stone wall" />
                    </div>
                </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-headline text-lg mb-2 text-primary">{t('howToPlayDialog.pieceMovementsTitle')}</h3>
              <p className="mb-2">{t('howToPlayDialog.pieceMovementsText')}</p>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="font-semibold">♔ {t('pieces.King')}:</span> {t('howToPlayDialog.kingDesc')}</li>
                <li><span className="font-semibold">♕ {t('pieces.Queen')}:</span> {t('howToPlayDialog.queenDesc')}</li>
                <li><span className="font-semibold">♖ {t('pieces.Rook')}:</span> {t('howToPlayDialog.rookDesc')}</li>
                <li><span className="font-semibold">♗ {t('pieces.Bishop')}:</span> {t('howToPlayDialog.bishopDesc')}</li>
                <li><span className="font-semibold">♘ {t('pieces.Knight')}:</span> {t('howToPlayDialog.knightDesc')}</li>
                <li><span className="font-semibold">♙ {t('pieces.Pawn')}:</span> {t('howToPlayDialog.pawnDesc')}
                    <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                        <li>{t('howToPlayDialog.pawnMove1')}</li>
                        <li>{t('howToPlayDialog.pawnMove2')}</li>
                        <li>{t('howToPlayDialog.pawnMove3')}</li>
                        <li>{t('howToPlayDialog.pawnMove4')}</li>
                    </ul>
                </li>
              </ul>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>{t('howToPlayDialog.closeButton')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
