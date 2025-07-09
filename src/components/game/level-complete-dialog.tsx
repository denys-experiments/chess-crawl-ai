
"use client";

import { useState, useEffect } from 'react';
import type { Piece } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { GamePiece } from '@/components/game/piece';
import { useTranslation } from '@/context/i18n';

interface LevelCompleteDialogProps {
  isOpen: boolean;
  level: number;
  playerPieces: Piece[];
  onNextLevel: (pieces: Piece[]) => void;
  getPieceDisplayName: (name: Piece['name']) => string;
}

export function LevelCompleteDialog({ isOpen, level, playerPieces, onNextLevel, getPieceDisplayName }: LevelCompleteDialogProps) {
    const [selectedPieces, setSelectedPieces] = useState<Piece[]>([]);
    const { t } = useTranslation();
    const maxCarryOver = Math.floor(level / 2) + 1;
    const selectablePieces = playerPieces.filter(p => p.piece !== 'King');

    useEffect(() => {
        if (isOpen) {
            setSelectedPieces([]);
        }
    }, [isOpen]);

    const togglePieceSelection = (piece: Piece) => {
        setSelectedPieces(prev => {
            if(prev.find(p => p.id === piece.id)) {
                return prev.filter(p => p.id !== piece.id);
            }
            if(prev.length < maxCarryOver) {
                return [...prev, piece];
            }
            return prev;
        });
    };

    const handleConfirm = () => {
        onNextLevel(selectedPieces);
    }

    return (
        <Dialog open={isOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('levelCompleteDialog.title', { level })}</DialogTitle>
                    <DialogDescription>
                        {t('levelCompleteDialog.description', { maxCarryOver })}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[40vh] pr-6">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4">
                        {selectablePieces.map(piece => (
                            <div key={piece.id} onClick={() => togglePieceSelection(piece)} className={`p-2 border-2 rounded-lg cursor-pointer flex flex-col items-center justify-center text-center transition-all ${selectedPieces.find(p => p.id === piece.id) ? 'border-primary bg-primary/20' : 'border-transparent hover:border-border'}`}>
                                 <GamePiece piece={piece} size="sm" />
                                 <span className="text-xs font-medium mt-1.5 leading-tight">{getPieceDisplayName(piece.name)}</span>
                                 <span className="text-xs text-muted-foreground">({t(`pieces.${piece.piece}`)})</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={selectedPieces.length > maxCarryOver}>
                       {t('levelCompleteDialog.button', { levelPlus1: level + 1, selected: selectedPieces.length, max: maxCarryOver })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
