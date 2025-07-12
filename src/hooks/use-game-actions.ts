
"use client";

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/context/i18n';
import type { UseGameStateReturn } from './use-game-state';
import type { Piece, Board, Position, PieceType, Tile, HistoryEntry } from '@/types';
import { getValidMoves as getValidMovesFromLogic, isWithinBoard as isWithinBoardFromLogic, isSquareAttackedBy as isSquareAttackedByFromLogic } from '@/lib/game-logic';
import { generateRandomName } from '@/lib/names';
import { playSound as playSoundLogic, initAudioContext } from '@/lib/sounds';
import { SOUND_ENABLED_KEY } from './use-game-state';

export function useGameActions(state: UseGameStateReturn, getPieceDisplayName: (name: Piece['name']) => string) {
    const { get: getState, setters } = state;
    const { toast } = useToast();
    const { t } = useTranslation();
    const audioInitialized = useRef(false);
    const clickLock = useRef(false);

    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    useEffect(() => {
        const savedSoundSetting = localStorage.getItem(SOUND_ENABLED_KEY);
        if (savedSoundSetting !== null) {
          setIsSoundEnabled(JSON.parse(savedSoundSetting));
        }
    }, []);

    const toggleSound = useCallback(() => {
        setIsSoundEnabled(prev => {
            const newState = !prev;
            localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(newState));
            return newState;
        });
    }, []);
    
    // --- Re-export logic functions for easy access ---
    const getValidMoves = getValidMovesFromLogic;
    const isWithinBoard = isWithinBoardFromLogic;
    const isSquareAttackedBy = isSquareAttackedByFromLogic;
    const playSound = playSoundLogic;

    const activeEnemyFactions = useMemo(() => {
        const board = getState().board;
        if (!board) return [];
        const factions = new Set<string>();
        board.forEach(row => row.forEach(tile => {
        if (tile?.type === 'piece' && tile.color !== 'white') {
            factions.add(tile.color);
        }
        }));
        return Array.from(factions).sort();
    }, [getState().board]);
  
    const turnOrder = useMemo(() => ['player', ...activeEnemyFactions], [activeEnemyFactions]);

    const advanceTurn = useCallback(() => {
        setters.setCurrentTurn(prevTurn => {
        const currentIndex = turnOrder.indexOf(prevTurn);
        const nextIndex = (currentIndex + 1) % turnOrder.length;
        return turnOrder[nextIndex];
        });
    }, [turnOrder, setters]);

    const getPromotionPiece = useCallback((level: number, playerPieces: Piece[]): PieceType => {
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
    }, []);

    const checkForAllyRescue = useCallback((pos: Position, currentBoard: Board, levelForRescue: number) => {
        const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        
        directions.forEach(([dx, dy]) => {
        if (isWithinBoard(pos.x + dx, pos.y + dy, currentBoard)) {
            const adjacentTile = currentBoard[pos.y + dy][pos.x + dx];
            if (adjacentTile?.type === 'sleeping_ally') {
            const newPieceType = adjacentTile.piece;
            const newPieceName = generateRandomName();
            currentBoard[pos.y + dy][pos.x + dx] = {
                type: 'piece',
                piece: newPieceType,
                color: 'white',
                x: pos.x + dx,
                y: pos.y + dy,
                id: `${pos.x + dx}-${pos.y + dy}-${Date.now()}`,
                name: newPieceName,
                discoveredOnLevel: levelForRescue,
                captures: 0,
            };
            toast({ title: t('toast.allyRescued'), description: t('toast.allyRescuedDesc', { pieceType: t(`pieces.${newPieceType}`) }) });
            setters.addToHistory({ 
                key: 'history.allyJoined', 
                values: { 
                    pieceTypeKey: `pieces.${newPieceType}`, 
                    name: getPieceDisplayName(newPieceName)
                } 
            });
            checkForAllyRescue({ x: pos.x + dx, y: pos.y + dy }, currentBoard, levelForRescue);
            }
        }
        });
    }, [toast, setters, t, getPieceDisplayName]);

    const checkForAllyRescueOnSetup = useCallback((currentBoard: Board, levelForRescue: number) => {
        currentBoard.forEach((row, y) => row.forEach((tile, x) => {
            if (tile?.type === 'piece' && tile.color === 'white') {
                checkForAllyRescue({x, y}, currentBoard, levelForRescue);
            }
        }));
    }, [checkForAllyRescue]);


    const movePiece = useCallback((from: Position, to: Position, onComplete: () => void) => {
        const { board, level, inventory } = getState();
        if (!board) return;

        const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
        const pieceToMove = JSON.parse(JSON.stringify(newBoard[from.y][from.x] as Piece));
        const targetTile = newBoard[to.y][to.x] ? JSON.parse(JSON.stringify(newBoard[to.y][to.x])) : null;

        let newPieceState: Piece = { ...pieceToMove, x: to.x, y: to.y };
        let historyEntry: HistoryEntry | null = null;
        
        if (targetTile?.type === 'piece' && targetTile.color !== pieceToMove.color) {
            if (isSoundEnabled) playSound('capture');
            newPieceState.captures = (newPieceState.captures || 0) + 1;
            historyEntry = {
                key: 'history.playerCapture',
                values: { name: getPieceDisplayName(pieceToMove.name), pieceKey: `pieces.${pieceToMove.piece}`, factionKey: `factions.${targetTile.color}`, targetPieceKey: `pieces.${targetTile.piece}`, x: to.x + 1, y: to.y + 1 },
            };
        } else if (targetTile?.type === 'chest') {
            if (isSoundEnabled) playSound('move');
            const currentPlayerPieces = board.flatMap(row => row.filter(tile => tile?.type === 'piece' && tile.color === 'white')) as Piece[];
            if (pieceToMove.piece === 'Pawn') {
                const newPieceType = getPromotionPiece(level, currentPlayerPieces);
                newPieceState = { ...newPieceState, id: `${newPieceType.toLowerCase()}-${Date.now()}`, piece: newPieceType, direction: undefined };
                toast({ title: t('toast.promotion'), description: t('toast.promotionDesc', { pieceType: t(`pieces.${newPieceType}`) }) });
                historyEntry = { key: 'history.playerPromotion', values: { name: getPieceDisplayName(pieceToMove.name), pieceKey: `pieces.${pieceToMove.piece}`, newPieceTypeKey: `pieces.${newPieceType}` } };
            } else {
                const availableCosmetics = ['sunglasses', 'tophat', 'partyhat', 'bowtie', 'heart', 'star'];
                const newCosmetic = availableCosmetics[Math.floor(Math.random() * availableCosmetics.length)];
                
                const existingCosmetics = inventory.cosmetics.filter(c => c !== pieceToMove.cosmetic);
                setters.setInventory(prev => ({...prev, cosmetics: [...existingCosmetics, newCosmetic]}));
                
                newPieceState.cosmetic = newCosmetic;
                const cosmeticName = t(`cosmetics.${newCosmetic}`);
                toast({ title: t('toast.chestOpened'), description: t('toast.chestOpenedDesc', { piece: t(`pieces.${pieceToMove.piece}`), cosmetic: cosmeticName}) });
                historyEntry = { key: 'history.playerCosmetic', values: { name: getPieceDisplayName(pieceToMove.name), pieceKey: `pieces.${pieceToMove.piece}`, cosmeticKey: `cosmetics.${newCosmetic}` } };
            }
        } else {
            if (isSoundEnabled) playSound('move');
            historyEntry = { key: 'history.playerMove', values: { name: getPieceDisplayName(pieceToMove.name), pieceKey: `pieces.${pieceToMove.piece}`, x: to.x + 1, y: to.y + 1 } };
        }

        if (pieceToMove.piece === 'Pawn') {
            const isOrthogonalMove = from.x === to.x || from.y === to.y;
            const currentDirection = pieceToMove.direction || (pieceToMove.color === 'white' ? 'up' : 'down');
            const forwardVector = { 'up': {y: -1}, 'down': {y: 1}, 'left': {x: -1}, 'right': {x: 1} }[currentDirection] as {x?: number, y?: number};
            const isStandardForwardMove = (forwardVector.y !== undefined && to.y === from.y + forwardVector.y && from.x === to.x) || (forwardVector.x !== undefined && to.x === from.x + forwardVector.x && from.y === to.y);
            if (isOrthogonalMove && !isStandardForwardMove) {
                let newDirection = pieceToMove.direction;
                if (to.x > from.x) newDirection = 'right';
                else if (to.x < from.x) newDirection = 'left';
                else if (to.y > from.y) newDirection = 'down';
                else if (to.y < from.y) newDirection = 'up';
                newPieceState = {...newPieceState, direction: newDirection};
            }
        }

        if (historyEntry) setters.addToHistory(historyEntry);
        newBoard[to.y][to.x] = newPieceState;
        newBoard[from.y][from.x] = null;
        
        checkForAllyRescue(to, newBoard, level);

        setters.setBoard(newBoard);
        setters.setSelectedPiece(null);
        
        setTimeout(() => {
            advanceTurn();
            onComplete();
        }, 300);
    }, [getState, setters, toast, t, getPieceDisplayName, checkForAllyRescue, advanceTurn, getPromotionPiece, playSound, isSoundEnabled]);

    const handleTileClick = useCallback((x: number, y: number) => {
        if (!audioInitialized.current) {
            initAudioContext();
            audioInitialized.current = true;
        }

        const { board, isLevelComplete, isGameOver, isPlayerMoving, currentTurn, isEnemyThinking, selectedPiece, availableMoves } = getState();
        if (!board || isLevelComplete || isGameOver || isPlayerMoving || clickLock.current) return;

        const isPlayerTurn = currentTurn === 'player' && !isEnemyThinking;

        if (selectedPiece && availableMoves.some(move => move.x === x && move.y === y)) {
            if (isPlayerTurn) {
                setters.setIsPlayerMoving(true);
                clickLock.current = true;
                
                const from = { ...selectedPiece };
                setters.setSelectedPiece(null);
                
                movePiece(from, { x, y }, () => {
                    setters.setIsPlayerMoving(false);
                    clickLock.current = false;
                });
            }
            return;
        }

        const clickedTile = board[y][x];

        if (clickedTile?.type === 'piece' && clickedTile.color === 'white') {
            if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
                setters.setSelectedPiece(null);
            } else {
                setters.setSelectedPiece({ x, y });
            }
            return;
        }

        if(isPlayerTurn) {
            setters.setSelectedPiece(null);
        }
    }, [getState, setters, movePiece]);
    
    useEffect(() => {
        const { selectedPiece, board, currentTurn, enemyPieces } = getState();
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
                setters.setAvailableMoves(threatenedMoves);
            } else {
                setters.setAvailableMoves(baseMoves.map(m => ({...m, isThreatened: false })));
            }
        } else if (currentTurn !== 'player') {
            // Do nothing, keep selection
        } else {
            setters.setAvailableMoves([]);
        }
    }, [getState().selectedPiece, getState().board, getState().currentTurn, getState().enemyPieces, setters]);


    const handleWinLevel = () => {
        setters.setIsLevelComplete(true);
        toast({ title: t('toast.cheatActivated'), description: t('toast.levelWon') });
    }

    const handleAwardCosmetic = () => {
        const { board, playerPieces } = getState();
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
            setters.setBoard(newBoard);
            toast({ title: t('toast.cheatActivated'), description: t('toast.cosmeticAwarded', { piece: t(`pieces.${pieceToDecorate.piece}`), cosmetic: cosmeticName }) });
        }
    }

    return {
        isSoundEnabled,
        toggleSound,
        handleTileClick,
        movePiece,
        advanceTurn,
        checkForAllyRescueOnSetup,
        getPromotionPiece,
        handleWinLevel,
        handleAwardCosmetic,
        isWithinBoard,
        isSquareAttackedBy,
        playSound
    };
}
