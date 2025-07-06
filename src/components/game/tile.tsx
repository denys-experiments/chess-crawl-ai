
import type { Tile as TileType, Position } from '@/types';
import { cn } from '@/lib/utils';
import { Box, User } from 'lucide-react';

interface TileProps {
  tile: TileType;
  position: Position;
  onClick: () => void;
  isSelected: boolean;
  isAvailableMove: boolean;
}

export function Tile({ tile, position, onClick, isSelected, isAvailableMove }: TileProps) {
  const { x, y } = position;
  const isDark = (x + y) % 2 !== 0;

  const tileContent = () => {
    if (!tile) return null;
    switch (tile.type) {
      case 'piece':
        return null; // Pieces are rendered separately on the board for animation
      case 'wall':
        return (
          <div className="w-full h-full bg-stone-800 border-2 border-stone-900/50" />
        );
      case 'chest':
        return <Box className="w-8 h-8 text-yellow-500" />;
      case 'sleeping_ally':
        return <User className="w-8 h-8 text-blue-300 opacity-60" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full h-full flex items-center justify-center cursor-pointer transition-colors duration-200 relative',
        isDark ? 'bg-secondary/50' : 'bg-secondary/20',
        {
          'bg-primary/50': isSelected,
        }
      )}
    >
      {tileContent()}
      {isAvailableMove && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              'animate-pulse rounded-full',
              tile?.type === 'piece'
                ? 'h-full w-full border-4 border-destructive/60'
                : 'h-1/3 w-1/3 bg-accent/60'
            )}
          />
        </div>
      )}
    </div>
  );
}
