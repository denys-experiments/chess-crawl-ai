
import { useRef, useEffect } from 'react';
import type { Board, Position, Piece } from '@/types';
import { Tile } from './tile';
import { cn } from '@/lib/utils';
import { GamePiece } from './piece';

interface GameBoardProps {
  board: Board;
  onTileClick: (x: number, y: number) => void;
  selectedPiece: Position | null;
  availableMoves: Position[];
  isLoading?: boolean;
}

export function GameBoard({ board, onTileClick, selectedPiece, availableMoves, isLoading }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    // On larger boards, the container is scrollable. When a new level loads
    // (indicated by isLoading=true), we scroll to the bottom to ensure the
    // player's pieces are in view.
    if (isLoading && containerRef.current) {
      const ele = containerRef.current;
      ele.scrollTop = ele.scrollHeight - ele.clientHeight;
    }
  }, [isLoading, board]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const ele = containerRef.current;
    if (!ele || e.button !== 0) return;

    isDraggingRef.current = false;
    ele.style.cursor = 'grabbing';
    
    const startPos = { x: e.pageX, y: e.pageY };
    const startScroll = { left: ele.scrollLeft, top: ele.scrollTop };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.pageX - startPos.x;
      const dy = moveEvent.pageY - startPos.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDraggingRef.current = true;
      }
      
      ele.scrollLeft = startScroll.left - dx;
      ele.scrollTop = startScroll.top - dy;
    };

    const handleMouseUp = () => {
      ele.style.cursor = 'grab';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleTileClickWrapper = (x: number, y: number) => {
      if (!isDraggingRef.current) {
          onTileClick(x,y);
      }
  }

  if (!board || board.length === 0) {
    return null;
  }
  
  const height = board.length;
  const width = board[0].length;
  const viewboxSize = 8;

  const displayWidth = Math.min(width, viewboxSize);
  const displayHeight = Math.min(height, viewboxSize);
  
  const cellSize = `min(calc(90svw / ${displayWidth}), calc(80svh / ${displayHeight}))`;
  
  const isLargeBoard = width > viewboxSize || height > viewboxSize;

  const allPieces = board.flat().filter((tile): tile is Piece => tile?.type === 'piece');
  allPieces.sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "bg-gray-500/10 rounded-lg border-2 border-primary/50 shadow-2xl shadow-primary/20 cursor-grab p-2",
        isLargeBoard 
          ? "overflow-auto" 
          : "w-full h-full flex items-center justify-center"
      )}
      style={isLargeBoard ? {
        width: `calc(${displayWidth} * ${cellSize})`,
        height: `calc(${displayHeight} * ${cellSize})`,
      } : {}}
    >
      <div 
        className="grid relative"
        style={{
          width: `calc(${width} * var(--cell-size))`,
          height: `calc(${height} * var(--cell-size))`,
          gridTemplateColumns: `repeat(${width}, 1fr)`,
          gridTemplateRows: `repeat(${height}, 1fr)`,
          '--cell-size': cellSize,
        } as React.CSSProperties}
      >
        {board.map((row, y) =>
          row.map((tile, x) => (
            <Tile
              key={`${x}-${y}`}
              tile={tile}
              position={{ x, y }}
              onClick={() => handleTileClickWrapper(x, y)}
              isSelected={selectedPiece?.x === x && selectedPiece?.y === y}
              isAvailableMove={availableMoves.some(move => move.x === x && move.y === y)}
            />
          ))
        )}
        {allPieces.map(piece => (
            <GamePiece key={piece.id} piece={piece} isBoardPiece={true} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
}
