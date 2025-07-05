
import { useRef } from 'react';
import type { Board, Position } from '@/types';
import { Tile } from './tile';

interface GameBoardProps {
  board: Board;
  onTileClick: (x: number, y: number) => void;
  selectedPiece: Position | null;
  availableMoves: Position[];
}

export function GameBoard({ board, onTileClick, selectedPiece, availableMoves }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

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
  const cellSizeRem = 5;

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className="w-full max-w-[calc(100vh-12rem)] max-h-[calc(100vh-12rem)] bg-gray-500/10 rounded-lg border-2 border-primary/50 shadow-2xl shadow-primary/20 overflow-auto cursor-grab"
    >
      <div 
        className="grid relative"
        style={{
          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
          width: `${width * cellSizeRem}rem`,
          height: `${height * cellSizeRem}rem`,
          minWidth: '100%',
          minHeight: '100%',
        }}
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
      </div>
    </div>
  );
}
