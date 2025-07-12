
"use client";

import { useCallback } from 'react';
import type { UseGameStateReturn } from './use-game-state';
import type { Piece, Tile, Position, HistoryEntry } from '@/types';
import { getValidMoves } from '@/lib/game-logic';
import { playSound } from '@/lib/sounds';

function createHistoryEntry(
    key: string,
    values: { [key: string]: any }
): HistoryEntry {
    return { key, values };
}


export function useEnemyAI(
    getState: UseGameStateReturn['get'],
    setters: UseGameStateReturn['setters'],
    advanceTurn: () => void
) {

    const finishEnemyTurn = useCallback((factionColor: string, movedPiece: Piece, targetTile: Tile | null) => {
        let key: string;
        let values: { [key: string]: any };

        if (targetTile?.type === 'piece') {
            if (targetTile.color === 'white') {
                const hasCosmetic = !!targetTile.cosmetic;
                key = hasCosmetic ? 'history.playerPieceCaptured_cosmetic' : 'history.playerPieceCaptured';
                values = {
                    name: targetTile.name,
                    pieceKey: `pieces.${targetTile.piece}`,
                    discoveredOnLevel: targetTile.discoveredOnLevel,
                    captures: targetTile.captures || 0,
                    ...(hasCosmetic && { cosmeticKey: `cosmetics.${targetTile.cosmetic}` }),
                    factionKey: `factions.${factionColor}`,
                    enemyPieceKey: `pieces.${movedPiece.piece}`
                };
            } else {
                key = 'history.enemyCapture';
                values = {
                    factionKey: `factions.${factionColor}`,
                    name: movedPiece.name,
                    pieceKey: `pieces.${movedPiece.piece}`,
                    x: movedPiece.x + 1,
                    y: movedPiece.y + 1,
                    targetFactionKey: `factions.${targetTile.color}`,
                    targetPieceKey: `pieces.${targetTile.piece}`,
                };
            }
        } else {
            key = 'history.enemyMove';
            values = {
                factionKey: `factions.${factionColor}`,
                name: movedPiece.name,
                pieceKey: `pieces.${movedPiece.piece}`,
                x: movedPiece.x + 1,
                y: movedPiece.y + 1,
            };
        }
        
        setters.addToHistory(createHistoryEntry(key, values));
        setters.setIsEnemyThinking(false);
        advanceTurn();
    }, [setters, advanceTurn]);

    const runEnemyTurn = useCallback((factionColor: string) => {
        const { board, isSoundEnabled } = getState();
        if (!board) return;
        setters.setIsEnemyThinking(true);

        const currentPieces: Piece[] = [];
        board.forEach(row => row.forEach(tile => {
            if (tile?.type === 'piece') {
                currentPieces.push(tile);
            }
        }));
        const enemies = currentPieces.filter(p => p.color === factionColor);
        const potentialTargets = currentPieces.filter(p => p.color !== factionColor);

        if (enemies.length === 0) {
            setters.setIsEnemyThinking(false);
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

                if (targetTile?.type === 'chest') {
                    score = -Infinity; // Heavily penalize moving to a chest
                } else if (targetTile?.type === 'piece' && targetTile.color !== enemy.color) {
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
                
                score += Math.random() * 2; 

                allPossibleMoves.push({ piece: enemy, move, score });
            }
        }
        
        if (allPossibleMoves.length === 0) {
            setters.addToHistory(createHistoryEntry('history.enemyNoMoves', { factionKey: `factions.${factionColor}`}));
            setters.setIsEnemyThinking(false);
            advanceTurn();
            return;
        }

        // Filter out moves with -Infinity score (like moving to a chest)
        const validMoves = allPossibleMoves.filter(move => move.score > -Infinity);
        if (validMoves.length === 0) {
             setters.addToHistory(createHistoryEntry('history.enemyNoMoves', { factionKey: `factions.${factionColor}`}));
            setters.setIsEnemyThinking(false);
            advanceTurn();
            return;
        }

        validMoves.sort((a, b) => b.score - a.score);
        const bestMove = validMoves[0];

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
        
        setters.setBoard(newBoard);

        setTimeout(() => {
            finishEnemyTurn(factionColor, newPieceState, targetTile);
        }, 300);
    }, [getState, setters, advanceTurn, finishEnemyTurn]);
    
    return { runEnemyTurn };
}

    
