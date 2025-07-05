"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Piece, Board, Position, SpecialTile } from '@/types';
import { GameBoard } from '@/components/game/board';
import { GameHud } from '@/components/game/hud';
import { initializeBoard, getValidMoves } from '@/lib/game-logic';
import { calculateEnemyMove } from '@/ai/flows/enemy-ai-move-calculation';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [level, setLevel] = useState(1);
  const [board, setBoard] = useState<Board>(() => initializeBoard(1));
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [availableMoves, setAvailableMoves] = useState<Position[]>([]);
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [playerPieces, setPlayerPieces] = useState<Piece[]>([]);
  const [enemyPieces, setEnemyPieces] = useState<Piece[]>([]);
  const [inventory, setInventory] = useState<{ pieces: Piece[], cosmetics: string[] }>({ pieces: [], cosmetics: [] });
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const newPlayerPieces: Piece[] = [];
    const newEnemyPieces: Piece[] = [];
    board.forEach((row, y) => {
      row.forEach((tile, x) => {
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
    if (newEnemyPieces.length === 0 && level > 0) {
      setIsLevelComplete(true);
    }
  }, [board, level]);

  const handleTileClick = (x: number, y: number) => {
    if (turn !== 'player' || isLoading) return;

    const clickedTile = board[y][x];

    if (selectedPiece) {
      const isValidMove = availableMoves.some(move => move.x === x && move.y === y);
      if (isValidMove) {
        movePiece(selectedPiece, { x, y });
      } else {
        setSelectedPiece(null);
        setAvailableMoves([]);
      }
    } else if (clickedTile?.type === 'piece' && clickedTile.color === 'white') {
      setSelectedPiece({ x, y });
      const moves = getValidMoves({ x, y }, board);
      setAvailableMoves(moves);
    }
  };

  const movePiece = (from: Position, to: Position) => {
    const newBoard = board.map(row => row.slice());
    const piece = newBoard[from.y][from.x] as Piece;
    
    // Handle special tiles
    const targetTile = newBoard[to.y][to.x];
    if (targetTile) {
      if(targetTile.type === 'chest') {
        const cosmetic = "sunglasses";
        setInventory(prev => ({...prev, cosmetics: [...prev.cosmetics, cosmetic]}));
        toast({ title: "Chest Opened!", description: `You found ${cosmetic}!` });
      }
      if(targetTile.type === 'sleeping_ally') {
        toast({ title: "Ally Rescued!", description: `A ${targetTile.piece} has joined your side!` });
      }
    }

    newBoard[to.y][to.x] = { ...piece, x: to.x, y: to.y };
    newBoard[from.y][from.x] = null;
    
    // Check for rescued allies
    checkForAllyRescue(to, newBoard);

    setBoard(newBoard);
    setSelectedPiece(null);
    setAvailableMoves([]);
    setTurn('enemy');
  };

  const checkForAllyRescue = (pos: Position, currentBoard: Board) => {
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    directions.forEach(([dx, dy]) => {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
        const adjacentTile = currentBoard[ny][nx];
        if (adjacentTile?.type === 'sleeping_ally') {
          currentBoard[ny][nx] = { type: 'piece', piece: adjacentTile.piece, color: 'white', x: nx, y: ny, id: `${nx}-${ny}-${Date.now()}` };
          toast({ title: "Ally Rescued!", description: `A friendly ${adjacentTile.piece} woke up!` });
        }
      }
    });
  }
  
  const runEnemyTurn = useCallback(async () => {
    setIsLoading(true);
    setAiReasoning('');
    let currentBoard = board;
    
    for (const enemy of enemyPieces) {
      const availableMoves = getValidMoves({ x: enemy.x, y: enemy.y }, currentBoard);
      if (availableMoves.length > 0) {
        try {
          const boardStateString = JSON.stringify(currentBoard);
          const playerPositions = playerPieces.map(p => `${p.piece} at ${String.fromCharCode(97 + p.x)}${8 - p.y}`);

          const result = await calculateEnemyMove({
            boardState: boardStateString,
            enemyPiecePosition: `${enemy.piece} at ${String.fromCharCode(97 + enemy.x)}${8 - enemy.y}`,
            playerPiecePositions: playerPositions,
            availableMoves: availableMoves.map(m => `${String.fromCharCode(97 + m.x)}${8 - m.y}`),
            difficulty: 'easy',
          });
          
          const newAiReasoning = `Enemy ${enemy.piece}: ${result.reasoning}\n`;
          setAiReasoning(prev => prev + newAiReasoning);

          const moveNotation = result.bestMove;
          const toX = moveNotation.charCodeAt(0) - 97;
          const toY = 8 - parseInt(moveNotation.slice(1));

          const bestMovePos = availableMoves.find(m => m.x === toX && m.y === toY);

          if (bestMovePos) {
            const newBoard = currentBoard.map(row => row.slice());
            const pieceToMove = newBoard[enemy.y][enemy.x];
            if (pieceToMove) {
              newBoard[bestMovePos.y][bestMovePos.x] = { ...pieceToMove, x: bestMovePos.x, y: bestMovePos.y };
              newBoard[enemy.y][enemy.x] = null;
              currentBoard = newBoard;
            }
          }
        } catch (error) {
          console.error("AI move calculation failed:", error);
          // Fallback to random move
           const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
            const newBoard = currentBoard.map(row => row.slice());
            const pieceToMove = newBoard[enemy.y][enemy.x];
            if (pieceToMove) {
                newBoard[randomMove.y][randomMove.x] = { ...pieceToMove, x: randomMove.x, y: randomMove.y };
                newBoard[enemy.y][enemy.x] = null;
                currentBoard = newBoard;
                 setAiReasoning(prev => prev + `Enemy ${enemy.piece} at ${String.fromCharCode(97 + enemy.x)}${8-enemy.y} moved randomly to ${String.fromCharCode(97 + randomMove.x)}${8-randomMove.y} due to an error.\n`);
            }
        }
        await new Promise(res => setTimeout(res, 500)); // Pause between moves
      }
    }

    setBoard(currentBoard);
    setIsLoading(false);
    setTurn('player');
  }, [board, enemyPieces, playerPieces]);


  useEffect(() => {
    if (turn === 'enemy' && enemyPieces.length > 0) {
      runEnemyTurn();
    }
  }, [turn, enemyPieces.length, runEnemyTurn]);
  
  const startNextLevel = () => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    setBoard(initializeBoard(nextLevel, inventory.pieces));
    setIsLevelComplete(false);
    setTurn('player');
  };
  
  const handleCarryOver = (piecesToCarry: Piece[]) => {
      setInventory(prev => ({...prev, pieces: piecesToCarry}));
      startNextLevel();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
        <div className="flex-grow flex items-center justify-center">
          <GameBoard
            board={board}
            onTileClick={handleTileClick}
            selectedPiece={selectedPiece}
            availableMoves={availableMoves}
          />
        </div>
        <GameHud 
          turn={turn}
          level={level}
          inventory={inventory}
          aiReasoning={aiReasoning}
          isLoading={isLoading}
        />
      </div>
      <LevelCompleteDialog 
        isOpen={isLevelComplete}
        level={level}
        playerPieces={playerPieces}
        onNextLevel={handleCarryOver}
      />
    </main>
  );
}

function LevelCompleteDialog({ isOpen, level, playerPieces, onNextLevel }: { isOpen: boolean; level: number; playerPieces: Piece[]; onNextLevel: (pieces: Piece[]) => void; }) {
    const [selectedPieces, setSelectedPieces] = useState<Piece[]>([]);
    const maxCarryOver = Math.floor(level / 2) + 1;

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
        setSelectedPieces([]);
    }

    return (
        <Dialog open={isOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Level {level} Complete!</DialogTitle>
                    <DialogDescription>
                        Congratulations! You've cleared the dungeon level. Select up to {maxCarryOver} pieces to bring to the next level.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-4 gap-4 py-4">
                    {playerPieces.map(piece => (
                        <div key={piece.id} onClick={() => togglePieceSelection(piece)} className={`p-2 border-2 rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all ${selectedPieces.find(p => p.id === piece.id) ? 'border-primary bg-primary/20' : 'border-border'}`}>
                             <span className="text-4xl">{getPieceUnicode(piece)}</span>
                             <span className="text-xs text-muted-foreground">{piece.piece}</span>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={handleConfirm}>
                       Start Level {level + 1} ({selectedPieces.length}/{maxCarryOver} selected)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function getPieceUnicode(piece: Piece) {
  const isWhite = piece.color === 'white';
  switch (piece.piece) {
    case 'King': return isWhite ? '♔' : '♚';
    case 'Queen': return isWhite ? '♕' : '♛';
    case 'Rook': return isWhite ? '♖' : '♜';
    case 'Bishop': return isWhite ? '♗' : '♝';
    case 'Knight': return isWhite ? '♘' : '♞';
    case 'Pawn': return isWhite ? '♙' : '♟';
    default: return '';
  }
}
