
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

  const getRotationClass = () => {
    if (piece.piece !== 'Pawn' || !piece.direction) return '';
    switch (piece.direction) {
        case 'up': return 'rotate-0';
        case 'right': return 'rotate-90';
        case 'down': return 'rotate-180';
        case 'left': return '-rotate-90';
        default: return '';
    }
  };

  const getPieceColorClass = () => {
    if (piece.color === 'white') {
        return 'text-foreground';
    }
    switch (piece.color) {
        case 'black': return 'text-red-400';
        case 'orange': return 'text-orange-400';
        case 'red': return 'text-red-600';
        case 'purple': return 'text-purple-500';
        case 'cyan': return 'text-cyan-400';
        default: return 'text-gray-500'; // Fallback for unknown factions
    }
  };


  const getCosmeticDisplay = () => {
    if (!piece.cosmetic) return null;

    let emoji = '';
    let classes = 'absolute';
    const sizeClass = size === 'lg' ? 'text-lg' : 'text-base';

    switch (piece.cosmetic) {
        case 'sunglasses':
            emoji = '😎';
            classes += ' top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2';
            break;
        case 'tophat':
            emoji = '🎩';
            classes += ' top-0 left-1/2 -translate-x-1/2 -translate-y-1/2';
            break;
        case 'partyhat':
            emoji = '🎉';
            classes += ' top-0 left-1/2 -translate-x-1/2 -translate-y-1/2';
            break;
        case 'bowtie':
            emoji = '🎀';
            classes += ' bottom-1/4 left-1/2 -translate-x-1/2';
            break;
        case 'heart':
            emoji = '❤️';
            classes += ' top-1/4 -right-2';
            break;
        case 'star':
            emoji = '⭐';
            classes += ' top-1/4 -left-2';
            break;
        default:
            return null;
    }

    return (
        <div className={cn(classes, sizeClass)} style={{ textShadow: 'none' }}>
            {emoji}
        </div>
    );
  };

  return (
    <div className="relative flex items-center justify-center pointer-events-none">
      <span
        className={cn(
          'drop-shadow-lg transition-transform duration-300',
          size === 'lg' ? 'text-4xl' : 'text-3xl',
          getPieceColorClass(),
          piece.piece === 'Pawn' ? getRotationClass() : ''
        )}
        style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
      >
        {getPieceUnicode()}
      </span>
      {getCosmeticDisplay()}
    </div>
  );
}
