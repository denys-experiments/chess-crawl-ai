import type { Piece } from '@/types';
import { cn } from '@/lib/utils';

interface PieceProps {
  piece: Piece;
  size?: 'sm' | 'lg';
}

export function GamePiece({ piece, size = 'lg' }: PieceProps) {
  const getPieceUnicode = () => {
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
  };

  const hasSunglasses = piece.cosmetics?.includes('sunglasses');

  return (
    <div className="relative flex items-center justify-center">
      <span
        className={cn(
          'drop-shadow-lg',
          size === 'lg' ? 'text-6xl md:text-7xl' : 'text-4xl',
          {
            'text-foreground': piece.color === 'white',
            'text-red-400': piece.color === 'black',
          }
        )}
        style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
      >
        {getPieceUnicode()}
      </span>
      {hasSunglasses && (
        <div className={cn("absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2", size === 'lg' ? 'text-2xl' : 'text-xl')} style={{ textShadow: 'none' }}>
          😎
        </div>
      )}
    </div>
  );
}
