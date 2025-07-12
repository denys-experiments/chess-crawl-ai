
export type PieceType = 'King' | 'Queen' | 'Rook' | 'Bishop' | 'Knight' | 'Pawn';
export type PieceColor = string;

export interface Piece {
  id: string;
  type: 'piece';
  piece: PieceType;
  color: PieceColor;
  x: number;
  y: number;
  name: string | { firstNameIndex: number; lastNameIndex: number; };
  discoveredOnLevel: number;
  captures: number;
  cosmetic?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export interface Wall {
  type: 'wall';
}

export interface Chest {
  type: 'chest';
}

export interface SleepingAlly {
  type: 'sleeping_ally';
  piece: PieceType;
}

export type Tile = Piece | Wall | Chest | SleepingAlly | null;

export type Board = Tile[][];

export interface Position {
  x: number;
  y: number;
}

export interface AvailableMove extends Position {
  isThreatened?: boolean;
}

export type HistoryEntry = {
    key: string;
    values: { [key: string]: any };
} | string;
