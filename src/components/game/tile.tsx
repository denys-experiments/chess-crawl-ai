
import type { Tile as TileType, Position } from '@/types';
import { GamePiece } from './piece';
import { cn } from '@/lib/utils';
import { Box, User, ShieldQuestion } from 'lucide-react';

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
        return <GamePiece key={tile.id} piece={tile} />;
      case 'wall':
        return (
          <div className="w-full h-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center">
             <ShieldQuestion className="w-8 h-8 text-slate-500" />
          </div>
        );
      case 'chest':
        return <Box className="w-10 h-10 text-yellow-500" />;
      case 'sleeping_ally':
        return <User className="w-10 h-10 text-blue-300 opacity-60" />;
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
          'hover:bg-accent/30': tile?.type !== 'wall',
        }
      )}
    >
      {tileContent()}
      {isAvailableMove && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1/3 h-1/3 rounded-full bg-accent/70 animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
