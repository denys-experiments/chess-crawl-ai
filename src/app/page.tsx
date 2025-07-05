"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Piece, Board, Position, SpecialTile } from '@/types';
import { GameBoard } from '@/components/game/board';
import { GameHud } from '@/components/game/hud';
import { initializeBoard, getValidMoves, calculateSimpleEnemyMove } from '@/lib/game-logic';
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
      // If clicking the same piece, deselect it.
      if (selectedPiece.x === x && selectedPiece.y === y) {
        setSelectedPiece(null);
        setAvailableMoves([]);
        return;
      }

      const isValidMove = availableMoves.some(move => move.x === x && move.y === y);
      if (isValidMove) {
        movePiece(selectedPiece, { x, y });
      } else if (clickedTile?.type === 'piece' && clickedTile.color === 'white') {
        // If another of the player's pieces is clicked, switch selection to that piece.
        setSelectedPiece({ x, y });
        setAvailableMoves(getValidMoves({ x, y }, board));
      } else {
        // If an empty tile or other invalid spot is clicked, deselect.
        setSelectedPiece(null);
        setAvailableMoves([]);
      }
    } else if (clickedTile?.type === 'piece' && clickedTile.color === 'white') {
      // If no piece is selected and a player piece is clicked, select it.
      setSelectedPiece({ x, y });
      setAvailableMoves(getValidMoves({ x, y }, board));
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

    await new Promise(res => setTimeout(res, 500));

    const enemies: Piece[] = [];
    board.forEach(row => row.forEach(tile => {
      if (tile?.type === 'piece' && tile.color === 'black') {
        enemies.push(tile);
      }
    }));

    if (enemies.length === 0) {
      setIsLoading(false);
      setTurn('player');
      return;
    }

    // Find all "best moves", one for each enemy piece that can move.
    const bestMoves = enemies.map(enemy => ({
      piece: enemy,
      move: calculateSimpleEnemyMove(enemy, board, playerPieces)
    })).filter(item => item.move !== null) as { piece: Piece; move: Position }[];

    if (bestMoves.length === 0) {
      setAiReasoning('Enemy has no available moves.');
      setIsLoading(false);
      setTurn('player');
      return;
    }

    // From the best moves, prioritize captures.
    const captureMoves = bestMoves.filter(({ move }) => {
      const targetTile = board[move.y][move.x];
      return targetTile?.type === 'piece' && targetTile.color === 'white';
    });
    
    let moveToMake: { piece: Piece; move: Position };

    if (captureMoves.length > 0) {
      // If there are capture moves, pick one of them randomly.
      moveToMake = captureMoves[Math.floor(Math.random() * captureMoves.length)];
    } else {
      // Otherwise, pick any of the best available moves randomly.
      moveToMake = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    const { piece, move } = moveToMake;
    const from = { x: piece.x, y: piece.y };

    const newBoard = board.map(row => row.slice());
    const pieceToMove = newBoard[from.y][from.x] as Piece;

    newBoard[move.y][move.x] = { ...pieceToMove, x: move.x, y: move.y };
    newBoard[from.y][from.x] = null;
    
    setBoard(newBoard);
    setAiReasoning(`Enemy ${piece.piece} moves to ${String.fromCharCode(97 + move.x)}${8 - move.y}.`);
    
    setIsLoading(false);
    setTurn('player');
  }, [board, playerPieces]);


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
