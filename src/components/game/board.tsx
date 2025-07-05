
import { useRef } from 'react';
import type { Board, Position, Piece } from '@/types';
import { Tile } from './tile';
import { cn } from '@/lib/utils';

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
  const viewboxSize = 8;

  // Determine the number of cells to fit into the viewport for each axis.
  // If the board dimension is > viewboxSize, we ensure viewboxSize cells are visible.
  // Otherwise, we fit the actual board dimension to fill the space.
  const displayWidth = width > viewboxSize ? viewboxSize : width;
  const displayHeight = height > viewboxSize ? viewboxSize : height;
  
  // Calculate the cell size. It must be a single value to maintain a 1:1 aspect ratio.
  // We take the smaller of the possible sizes to ensure everything fits as required.
  // We use "small viewport" (svw/svh) units for better mobile compatibility.
  // The 90/80 values account for screen padding and the HUD.
  const cellSize = `min(90svw / ${displayWidth}, 80svh / ${displayHeight})`;

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className={cn(
        // This is the VIEWPORT. It fills available space and provides scrolling.
        "w-full h-full bg-gray-500/10 rounded-lg border-2 border-primary/50 shadow-2xl shadow-primary/20",
        "flex items-center justify-center overflow-auto cursor-grab p-2"
      )}
    >
      <div 
        className="grid relative"
        style={{
          // The GRID's total size is calculated from the number of cells and the calculated cell size.
          // This makes a 10x10 board larger than the viewport, enabling scrolling.
          width: `calc(${width} * ${cellSize})`,
          height: `calc(${height} * ${cellSize})`,
          gridTemplateColumns: `repeat(${width}, 1fr)`,
          gridTemplateRows: `repeat(${height}, 1fr)`,
        }}
      >
        {board.map((row, y) =>
          row.map((tile, x) => (
            <Tile
              key={`${x}-${y}-${tile?.type}-${(tile as Piece)?.id ?? ''}`}
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
