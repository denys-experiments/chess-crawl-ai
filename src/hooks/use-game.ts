
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Piece, Board, Position, PieceType, Tile, AvailableMove, HistoryEntry } from '@/types';
import { initializeBoard, getValidMoves, isWithinBoard, isSquareAttackedBy } from '@/lib/game-logic';
import { useToast } from "@/hooks/use-toast";
import { generateRandomName } from '@/lib/names';
import { useTranslation } from '@/context/i18n';
import { playSound, initAudioContext } from '@/lib/sounds';

const SAVE_GAME_KEY = 'chess-crawl-save-game';
const SOUND_ENABLED_KEY = 'chess-crawl-sound-enabled';

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


export function useGame() {
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
  const clickLock = useRef(false);
  const [currentTurn, setCurrentTurn] = useState('player');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const audioInitialized = useRef(false);

  const { toast } = useToast();
  const { t, locale } = useTranslation();

  const getPieceDisplayName = useCallback((name: Piece['name']) => {
    if (typeof name === 'string') {
        return name; // For backward compatibility with old saves
    }
    if (name) {
        const firstName = t(`nameParts.firstNames.${name.firstNameIndex}`);
        const lastName = t(`nameParts.lastNames.${name.lastNameIndex}`);
        if (locale === 'ja') {
            return `${lastName} ${firstName}`;
        }
        return `${firstName} ${lastName}`;
    }
    return t('pieces.Unnamed');
  }, [t, locale]);
  
  const appendToDebugLog = useCallback((message: string) => {
    setDebugLog(prev => `${prev}\n\n${message}`.trim());
  }, []);

  const addToHistory = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev].slice(0, 50));
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
            name: piece.name,
            pieceKey: `pieces.${piece.piece}`
          }
        });
      });
    }
    
    setLevel(levelToSetup);
    
    const { board: newBoard } = initializeBoard(levelToSetup, finalPieces);
    
    const checkForAllyRescueOnSetup = (pos: Position, currentBoard: Board, levelForRescue: number) => {
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
            addToHistory({ 
                key: 'history.allyJoined', 
                values: { 
                    pieceTypeKey: `pieces.${newPieceType}`, 
                    name: newPieceName 
                } 
            });
            checkForAllyRescueOnSetup({ x: nx, y: ny }, currentBoard, levelForRescue);
          }
        }
      });
    };
    
    newBoard.forEach((row, y) => row.forEach((tile, x) => {
        if (tile?.type === 'piece' && tile.color === 'white') {
            checkForAllyRescueOnSetup({x, y}, newBoard, levelToSetup);
        }
    }));
    
    setBoard(newBoard);
    setCurrentTurn('player');
    
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
  }, [appendToDebugLog, addToHistory, getPieceDisplayName, t]);
  
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
    
    const savedSoundSetting = localStorage.getItem(SOUND_ENABLED_KEY);
    if (savedSoundSetting !== null) {
      setIsSoundEnabled(JSON.parse(savedSoundSetting));
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
        if (inCheck && !isKingInCheck) {
            if (isSoundEnabled) playSound('check');
        }
        setIsKingInCheck(inCheck);
    } else {
        setIsKingInCheck(false);
    }

    if (level > 0 && !isLoading) {
      if (newEnemyPieces.length === 0 && newPlayerPieces.length > 0 && !isLevelComplete) {
        if (isSoundEnabled) playSound('win');
        setIsLevelComplete(true);
      } else if ((newPlayerPieces.length === 0 || !newPlayerPieces.some(p => p.piece === 'King')) && !isGameOver) {
        if (isSoundEnabled) playSound('lose');
        setIsGameOver(true);
        localStorage.removeItem(SAVE_GAME_KEY);
      }
    }
  }, [board, level, isLoading, isKingInCheck, isLevelComplete, isGameOver, isSoundEnabled]);
  
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
          addToHistory({ 
              key: 'history.allyJoined', 
              values: { 
                  pieceTypeKey: `pieces.${newPieceType}`, 
                  name: newPieceName 
              } 
          });
          checkForAllyRescue({ x: nx, y: ny }, currentBoard, levelForRescue);
        }
      }
    });
  }, [toast, addToHistory, t]);

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
    
    let historyEntry: HistoryEntry | null = null;
    
    if (targetTile?.type === 'piece' && targetTile.color !== pieceToMove.color) {
        if (isSoundEnabled) playSound('capture');
        newPieceState.captures = (newPieceState.captures || 0) + 1;
        historyEntry = {
            key: 'history.playerCapture',
            values: {
                name: pieceToMove.name,
                pieceKey: `pieces.${pieceToMove.piece}`,
                factionKey: `factions.${targetTile.color}`,
                targetPieceKey: `pieces.${targetTile.piece}`,
                x: to.x + 1,
                y: to.y + 1,
            },
        };
    } else if (targetTile?.type === 'chest') {
      if (isSoundEnabled) playSound('move');
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
        historyEntry = {
            key: 'history.playerPromotion',
            values: {
                name: pieceToMove.name,
                pieceKey: `pieces.${pieceToMove.piece}`,
                newPieceTypeKey: `pieces.${newPieceType}`,
            },
        };
      } else {
        const availableCosmetics = ['sunglasses', 'tophat', 'partyhat', 'bowtie', 'heart', 'star'];
        const newCosmetic = availableCosmetics[Math.floor(Math.random() * availableCosmetics.length)];
        
        const existingCosmetics = inventory.cosmetics.filter(c => c !== pieceToMove.cosmetic);
        setInventory(prev => ({...prev, cosmetics: [...existingCosmetics, newCosmetic]}));
        
        newPieceState.cosmetic = newCosmetic;
        const cosmeticName = t(`cosmetics.${newCosmetic}`);
        toast({ title: t('toast.chestOpened'), description: t('toast.chestOpenedDesc', { piece: t(`pieces.${pieceToMove.piece}`), cosmetic: cosmeticName}) });
        historyEntry = {
            key: 'history.playerCosmetic',
            values: {
                name: pieceToMove.name,
                pieceKey: `pieces.${pieceToMove.piece}`,
                cosmeticKey: `cosmetics.${newCosmetic}`,
            },
        };
      }
    } else {
        if (isSoundEnabled) playSound('move');
        historyEntry = {
            key: 'history.playerMove',
            values: {
                name: pieceToMove.name,
                pieceKey: `pieces.${pieceToMove.piece}`,
                x: to.x + 1,
                y: to.y + 1,
            },
        };
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

    if (historyEntry) {
        addToHistory(historyEntry);
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
  }, [board, checkForAllyRescue, inventory.cosmetics, level, toast, advanceTurn, addToHistory, t, isSoundEnabled]);

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!audioInitialized.current) {
      initAudioContext();
      audioInitialized.current = true;
    }

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
    let historyEntry: HistoryEntry;
    if (targetTile?.type === 'piece') {
        if (targetTile.color === 'white') {
            const hasCosmetic = !!targetTile.cosmetic;
            historyEntry = {
                key: hasCosmetic ? 'history.playerPieceCaptured_cosmetic' : 'history.playerPieceCaptured',
                values: {
                    name: targetTile.name,
                    pieceKey: `pieces.${targetTile.piece}`,
                    discoveredOnLevel: targetTile.discoveredOnLevel,
                    captures: targetTile.captures || 0,
                    ...(hasCosmetic && { cosmeticKey: `cosmetics.${targetTile.cosmetic}` }),
                    factionKey: `factions.${factionColor}`,
                    enemyPieceKey: `pieces.${movedPiece.piece}`
                }
            };
        } else {
            historyEntry = {
                key: 'history.enemyCapture',
                values: {
                    factionKey: `factions.${factionColor}`,
                    name: movedPiece.name,
                    pieceKey: `pieces.${movedPiece.piece}`,
                    x: movedPiece.x + 1,
                    y: movedPiece.y + 1,
                    targetFactionKey: `factions.${targetTile.color}`,
                    targetPieceKey: `pieces.${targetTile.piece}`,
                },
            };
        }
    } else {
        historyEntry = {
            key: 'history.enemyMove',
            values: {
                factionKey: `factions.${factionColor}`,
                name: movedPiece.name,
                pieceKey: `pieces.${movedPiece.piece}`,
                x: movedPiece.x + 1,
                y: movedPiece.y + 1,
            },
        };
    }
    
    addToHistory(historyEntry);
    setIsEnemyThinking(false);
    advanceTurn();
  }, [advanceTurn, addToHistory]);

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
        addToHistory({ 
            key: 'history.enemyNoMoves', 
            values: { 
                factionKey: `factions.${factionColor}` 
            } 
        });
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
        if (isSoundEnabled) playSound('capture');
        newPieceState.captures = (newPieceState.captures || 0) + 1;
    } else {
        if (isSoundEnabled) playSound('move');
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
  }, [board, advanceTurn, finishEnemyTurn, addToHistory, isSoundEnabled]);


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

  return {
    state: {
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
      isKingInCheck,
      debugLog,
      currentTurn,
      isHelpOpen,
      isSoundEnabled,
    },
    actions: {
      handleTileClick,
      restartGame,
      handleCarryOver,
      setIsHelpOpen,
      setIsSoundEnabled,
      handleRegenerateLevel,
      handleWinLevel,
      handleCreatePiece,
      handlePromotePawn,
      handleAwardCosmetic,
    },
    getPieceDisplayName,
  }
}
