import type { Piece } from '@/types';
import { cn } from '@/lib/utils';

interface PieceProps {
  piece: Piece;
}

export function GamePiece({ piece }: PieceProps) {
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
          'text-6xl md:text-7xl drop-shadow-lg',
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
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl" style={{ textShadow: 'none' }}>
          😎
        </div>
      )}
    </div>
  );
}
