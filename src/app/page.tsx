
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Piece, Board, Position, PieceType } from '@/types';
import { GameBoard } from '@/components/game/board';
import { GameHud } from '@/components/game/hud';
import { initializeBoard, getValidMoves, isWithinBoard } from '@/lib/game-logic';
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
import { GamePiece } from '@/components/game/piece';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';

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
  const [availableMoves, setAvailableMoves] = useState<Position[]>([]);
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [playerPieces, setPlayerPieces] = useState<Piece[]>([]);
  const [enemyPieces, setEnemyPieces] = useState<Piece[]>([]);
  const [inventory, setInventory] = useState<{ pieces: Piece[], cosmetics: string[] }>({ pieces: [], cosmetics: [] });
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnemyThinking, setIsEnemyThinking] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    // Board initialization is now client-side only to prevent hydration errors
    const initialBoard = initializeBoard(1);
    checkForInitialRescues(initialBoard);
    setBoard(initialBoard);
    setIsLoading(false);
  }, []);

  const checkForInitialRescues = (initialBoard: Board) => {
    const playerPiecesOnBoard: Piece[] = [];
    initialBoard.forEach((row) => {
        row.forEach((tile) => {
            if (tile?.type === 'piece' && tile.color === 'white') {
                playerPiecesOnBoard.push(tile);
            }
        });
    });
    playerPiecesOnBoard.forEach(piece => {
        checkForAllyRescue({x: piece.x, y: piece.y}, initialBoard);
    });
  }

  useEffect(() => {
    if (!board) return;

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

    if (level > 0 && !isLoading) {
      if (newEnemyPieces.length === 0 && newPlayerPieces.length > 0) {
        setIsLevelComplete(true);
      } else if (newPlayerPieces.length === 0 || !newPlayerPieces.some(p => p.piece === 'King')) {
        setIsGameOver(true);
      }
    }
  }, [board, level, isLoading]);

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!board || turn !== 'player' || isEnemyThinking || isLevelComplete || isGameOver) return;

    const clickedTile = board[y][x];

    if (selectedPiece) {
      const isSamePiece = selectedPiece.x === x && selectedPiece.y === y;
      if (isSamePiece) {
        setSelectedPiece(null);
        setAvailableMoves([]);
        return;
      }

      const isValidMove = availableMoves.some(move => move.x === x && move.y === y);
      if (isValidMove) {
        movePiece(selectedPiece, { x, y });
      } else if (clickedTile?.type === 'piece' && clickedTile.color === 'white') {
        setSelectedPiece({ x, y });
        setAvailableMoves(getValidMoves({ x, y }, board));
      } else {
        setSelectedPiece(null);
        setAvailableMoves([]);
      }
    } else if (clickedTile?.type === 'piece' && clickedTile.color === 'white') {
      setSelectedPiece({ x, y });
      setAvailableMoves(getValidMoves({ x, y }, board));
    }
  }, [turn, isEnemyThinking, selectedPiece, availableMoves, board, isLevelComplete, isGameOver]);

  const movePiece = (from: Position, to: Position) => {
    if (!board) return;
    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const pieceToMove = JSON.parse(JSON.stringify(newBoard[from.y][from.x] as Piece));
    const targetTile = newBoard[to.y][to.x];

    let newPieceState: Piece = {
        ...pieceToMove,
        x: to.x,
        y: to.y,
    };
    
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

    if (targetTile?.type === 'chest') {
      if (pieceToMove.piece === 'Pawn') {
        const newPieceType = getPromotionPiece(level, playerPieces);
        newPieceState = {
          ...newPieceState,
          piece: newPieceType,
          direction: undefined,
        };
        toast({ title: "Promotion!", description: `Your Pawn promoted to a ${newPieceType}!` });
      } else {
        const availableCosmetics = ['sunglasses', 'tophat', 'partyhat', 'bowtie', 'heart', 'star'];
        const cosmeticDisplayNames: { [key: string]: string } = {
            sunglasses: 'sunglasses',
            tophat: 'a top hat',
            partyhat: 'a party hat',
            bowtie: 'a bowtie',
            heart: 'a heart',
            star: 'a star',
        };
        const newCosmetic = availableCosmetics[Math.floor(Math.random() * availableCosmetics.length)];
        
        const existingCosmetics = inventory.cosmetics.filter(c => c !== pieceToMove.cosmetic);
        setInventory(prev => ({...prev, cosmetics: [...existingCosmetics, newCosmetic]}));
        
        newPieceState.cosmetic = newCosmetic;

        toast({ title: "Chest Opened!", description: `Your ${pieceToMove.piece} found ${cosmeticDisplayNames[newCosmetic]}!` });
      }
    }

    newBoard[to.y][to.x] = newPieceState;
    newBoard[from.y][from.x] = null;
    
    checkForAllyRescue(to, newBoard);

    setBoard(newBoard);
    setSelectedPiece(null);
    setAvailableMoves([]);
    setTurn('enemy');
  };

  const checkForAllyRescue = (pos: Position, currentBoard: Board) => {
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    const height = currentBoard.length;
    const width = currentBoard[0]?.length || 0;
    
    directions.forEach(([dx, dy]) => {
      const nx = pos.x + dx;
      const ny = pos.y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const adjacentTile = currentBoard[ny][nx];
        if (adjacentTile?.type === 'sleeping_ally') {
          const newPieceType = adjacentTile.piece;
          currentBoard[ny][nx] = { type: 'piece', piece: newPieceType, color: 'white', x: nx, y: ny, id: `${nx}-${ny}-${Date.now()}` };
          toast({ title: "Ally Rescued!", description: `A friendly ${newPieceType} woke up!` });
          // Recursive call to check for chain reactions
          checkForAllyRescue({ x: nx, y: ny }, currentBoard);
        }
      }
    });
  }
  
  const runEnemyTurn = useCallback(async () => {
    if (!board || !playerPieces) return;
    setIsEnemyThinking(true);
    setAiReasoning('');

    await new Promise(res => setTimeout(res, 200));

    const enemies: Piece[] = [];
    board.forEach(row => row.forEach(tile => {
      if (tile?.type === 'piece' && tile.color === 'black') {
        enemies.push(tile);
      }
    }));

    if (enemies.length === 0) {
      setIsEnemyThinking(false);
      setTurn('player');
      return;
    }

    const allPossibleMoves: { piece: Piece; move: Position; score: number }[] = [];
    const playerKing = playerPieces.find(p => p.piece === 'King');

    const height = board.length;
    const width = board[0].length;
    const widthCenter = (width - 1) / 2;
    const heightCenter = (height - 1) / 2;

    for (const enemy of enemies) {
        const moves = getValidMoves({x: enemy.x, y: enemy.y}, board);
        const validEnemyMoves = moves.filter(move => {
            const targetTile = board[move.y][move.x];
            if (targetTile?.type === 'chest') {
                return false;
            }
            return targetTile?.type !== 'sleeping_ally';
        });

        for (const move of validEnemyMoves) {
            let score = 0;
            const targetTile = board[move.y][move.x];

            if (targetTile?.type === 'piece' && targetTile.color === 'white') {
                switch (targetTile.piece) {
                    case 'Queen': score += 90; break;
                    case 'Rook': score += 50; break;
                    case 'Bishop': score += 30; break;
                    case 'Knight': score += 30; break;
                    case 'Pawn': score += 10; break;
                    case 'King': score += 1000; break;
                }
            }
            
            if (playerKing) {
                const currentDist = Math.abs(enemy.x - playerKing.x) + Math.abs(enemy.y - playerKing.y);
                const newDist = Math.abs(move.x - playerKing.x) + Math.abs(move.y - playerKing.y);
                if (newDist < currentDist) {
                    score += 5;
                }
            } else if (playerPieces.length > 0) {
                 const closestPlayer = [...playerPieces].sort((a,b) => (Math.abs(enemy.x - a.x) + Math.abs(enemy.y - a.y)) - (Math.abs(enemy.x - b.x) + Math.abs(enemy.y - b.y)))[0];
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
        setAiReasoning('Enemy has no available moves.');
        setIsEnemyThinking(false);
        setTurn('player');
        return;
    }

    allPossibleMoves.sort((a, b) => b.score - a.score);
    const bestMove = allPossibleMoves[0];

    const { piece: pieceToMove, move } = bestMove;
    const from = { x: pieceToMove.x, y: pieceToMove.y };
    const targetTile = board[move.y][move.x];

    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    
    let newPieceState: Piece = JSON.parse(JSON.stringify(newBoard[from.y][from.x] as Piece));
    newPieceState.x = move.x;
    newPieceState.y = move.y;
    
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

    let reasoning = `Enemy ${pieceToMove.piece} moves to column ${move.x + 1}, row ${move.y + 1}.`;
    if (targetTile?.type === 'piece') {
        reasoning += ` Capturing a ${targetTile.piece}.`;
    }
    setAiReasoning(reasoning);

    setIsEnemyThinking(false);
    setTurn('player');
  }, [board, playerPieces, getValidMoves]);


  useEffect(() => {
    if (turn === 'enemy' && !isEnemyThinking && enemyPieces.length > 0 && !isGameOver && !isLevelComplete) {
      runEnemyTurn();
    }
  }, [turn, isEnemyThinking, enemyPieces.length, runEnemyTurn, isGameOver, isLevelComplete]);
  
  const startNextLevel = (piecesToCarry: Piece[]) => {
    setIsLoading(true);
    const nextLevel = level + 1;
    setLevel(nextLevel);
    
    const newBoard = initializeBoard(nextLevel, piecesToCarry);
    checkForInitialRescues(newBoard);
    
    setBoard(newBoard);
    setIsLevelComplete(false);
    setTurn('player');
    setIsLoading(false);
  };

  const restartGame = () => {
    setIsLoading(true);
    setLevel(1);
    const newBoard = initializeBoard(1);
    checkForInitialRescues(newBoard);
    setBoard(newBoard);
    setSelectedPiece(null);
    setAvailableMoves([]);
    setTurn('player');
    setInventory({ pieces: [], cosmetics: [] });
    setAiReasoning('');
    setIsLevelComplete(false);
    setIsGameOver(false);
    setIsLoading(false);
  };
  
  const handleCarryOver = (piecesToCarry: Piece[]) => {
      const king = playerPieces.find(p => p.piece === 'King');
      const allCarriedPieces = king ? [...piecesToCarry, {...king, cosmetic: king.cosmetic, id: `wk-${Date.now()}`}] : piecesToCarry;

      setInventory(prev => ({...prev, pieces: allCarriedPieces}));
      startNextLevel(allCarriedPieces);
  };

  // --- CHEAT FUNCTIONS ---

  const handleRegenerateLevel = (width: number, height: number) => {
    if (!board) return;
    setIsLoading(true);
    const king = playerPieces.find(p => p.piece === 'King');
    const newBoard = initializeBoard(level, king ? [king] : [], { width, height });
    checkForInitialRescues(newBoard);
    setBoard(newBoard);
    setSelectedPiece(null);
    setAvailableMoves([]);
    setTurn('player');
    setAiReasoning('');
    setIsLevelComplete(false);
    setIsGameOver(false);
    setIsLoading(false);
    toast({ title: "Cheat Activated!", description: `Level regenerated to ${width}x${height}.` });
  }

  const handleWinLevel = () => {
    setIsLevelComplete(true);
    toast({ title: "Cheat Activated!", description: "You've won the level!" });
  }

  const handleCreatePiece = (pieceType: PieceType) => {
    if (!board) return;
    const king = playerPieces.find(p => p.piece === 'King');
    if (!king) {
        toast({ title: "Cheat Failed", description: "Player King not found.", variant: "destructive" });
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
        toast({ title: "Cheat Failed", description: "No empty space near the King to spawn a piece.", variant: "destructive" });
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
        id: `${pieceType}-${Date.now()}`
    };
    setBoard(newBoard);
    toast({ title: "Cheat Activated!", description: `A friendly ${pieceType} has appeared.` });
  }

  const handlePromotePawn = () => {
    if (!board) return;
    const pawns = playerPieces.filter(p => p.piece === 'Pawn');
    if (pawns.length === 0) {
        toast({ title: "Cheat Failed", description: "No player pawns available to promote.", variant: "destructive" });
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
        toast({ title: "Cheat Activated!", description: `A pawn has been promoted to a ${newPieceType}.` });
    }
  }

  const handleAwardCosmetic = () => {
    if (!board) return;
    const nonPawns = playerPieces.filter(p => p.piece !== 'Pawn');
    if (nonPawns.length === 0) {
        toast({ title: "Cheat Failed", description: "No non-pawn pieces available to award cosmetic.", variant: "destructive" });
        return;
    }
    const randomPiece = nonPawns[Math.floor(Math.random() * nonPawns.length)];

    const availableCosmetics = ['sunglasses', 'tophat', 'partyhat', 'bowtie', 'heart', 'star'];
    const cosmeticDisplayNames: { [key: string]: string } = {
        sunglasses: 'sunglasses',
        tophat: 'a top hat',
        partyhat: 'a party hat',
        bowtie: 'a bowtie',
        heart: 'a heart',
        star: 'a star',
    };
    const newCosmetic = availableCosmetics[Math.floor(Math.random() * availableCosmetics.length)];

    const newBoard = board.map(row => row.map(tile => tile ? {...tile} : null));
    const pieceToDecorate = newBoard[randomPiece.y][randomPiece.x];
    if(pieceToDecorate?.type === 'piece') {
        (newBoard[randomPiece.y][randomPiece.x] as Piece).cosmetic = newCosmetic;
        setBoard(newBoard);
        toast({ title: "Cheat Activated!", description: `Your ${pieceToDecorate.piece} received ${cosmeticDisplayNames[newCosmetic]}.` });
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
          />
        </div>
        <GameHud 
          turn={turn}
          level={level}
          inventory={inventory}
          aiReasoning={aiReasoning}
          isEnemyThinking={isEnemyThinking}
          onRegenerateLevel={handleRegenerateLevel}
          onWinLevel={handleWinLevel}
          onCreatePiece={handleCreatePiece}
          onPromotePawn={handlePromotePawn}
          onAwardCosmetic={handleAwardCosmetic}
        />
      </div>
      <Toaster />
      <LevelCompleteDialog 
        isOpen={isLevelComplete}
        level={level}
        playerPieces={playerPieces}
        onNextLevel={handleCarryOver}
      />
      <GameOverDialog 
        isOpen={isGameOver}
        onRestart={restartGame}
      />
    </main>
  );
}

function LevelCompleteDialog({ isOpen, level, playerPieces, onNextLevel }: { isOpen: boolean; level: number; playerPieces: Piece[]; onNextLevel: (pieces: Piece[]) => void; }) {
    const [selectedPieces, setSelectedPieces] = useState<Piece[]>([]);
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
                    <DialogTitle>Level {level} Complete!</DialogTitle>
                    <DialogDescription>
                        Congratulations! Your King is automatically carried over. Select up to {maxCarryOver} additional pieces to bring to the next level.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-4 gap-4 py-4">
                    {selectablePieces.map(piece => (
                        <div key={piece.id} onClick={() => togglePieceSelection(piece)} className={`p-2 border-2 rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all ${selectedPieces.find(p => p.id === piece.id) ? 'border-primary bg-primary/20' : 'border-border'}`}>
                             <GamePiece piece={piece} size="sm" />
                             <span className="text-xs text-muted-foreground">{piece.piece}</span>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={selectedPieces.length > maxCarryOver}>
                       Start Level {level + 1} ({selectedPieces.length}/{maxCarryOver} selected)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GameOverDialog({ isOpen, onRestart }: { isOpen: boolean; onRestart: () => void; }) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Game Over</DialogTitle>
          <DialogDescription>
            Your King has been defeated. Better luck next time!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onRestart}>Play Again</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
