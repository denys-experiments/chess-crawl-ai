import type { Board, Position } from '@/types';
import { Tile } from './tile';

interface GameBoardProps {
  board: Board;
  onTileClick: (x: number, y: number) => void;
  selectedPiece: Position | null;
  availableMoves: Position[];
}

export function GameBoard({ board, onTileClick, selectedPiece, availableMoves }: GameBoardProps) {
  return (
    <div className="grid grid-cols-8 grid-rows-8 aspect-square w-full max-w-[calc(100vh-10rem)] bg-gray-500/10 rounded-lg border-2 border-primary/50 shadow-2xl shadow-primary/20 overflow-hidden">
      {board.map((row, y) =>
        row.map((tile, x) => (
          <Tile
            key={`${x}-${y}`}
            tile={tile}
            position={{ x, y }}
            onClick={() => onTileClick(x, y)}
            isSelected={selectedPiece?.x === x && selectedPiece?.y === y}
            isAvailableMove={availableMoves.some(move => move.x === x && move.y === y)}
          />
        ))
      )}
    </div>
  );
}
