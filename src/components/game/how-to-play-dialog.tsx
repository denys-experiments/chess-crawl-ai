
"use client";

import Image from 'next/image';
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
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/context/i18n';

interface HowToPlayDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function HowToPlayDialog({ isOpen, onOpenChange }: HowToPlayDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('howToPlayDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('howToPlayDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-6">
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-headline text-lg mb-2 text-primary">{t('howToPlayDialog.goalTitle')}</h3>
              <p>
                {t('howToPlayDialog.goalText')}
              </p>
            </div>
            
            <Separator />

            <div>
              <h3 className="font-headline text-lg mb-2 text-primary">{t('howToPlayDialog.yourTurnTitle')}</h3>
              <div className="grid md:grid-cols-2 gap-4 items-center">
                <p>
                  {t('howToPlayDialog.yourTurnText')}
                </p>
                <Image src="https://placehold.co/400x250.png" alt="Selecting a piece and its available moves" width={400} height={250} className="rounded-md" data-ai-hint="game board" />
              </div>
            </div>

            <Separator />
            
            <div>
                <h3 className="font-headline text-lg mb-2 text-primary">{t('howToPlayDialog.boardObjectsTitle')}</h3>
                <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                         <div>
                            <h4 className="font-semibold mb-1">{t('howToPlayDialog.sleepingAlliesTitle')}</h4>
                            <p>{t('howToPlayDialog.sleepingAlliesText')}</p>
                        </div>
                        <Image src="https://placehold.co/400x250.png" alt="A player piece next to a sleeping ally" width={400} height={250} className="rounded-md" data-ai-hint="chess piece" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                        <div>
                            <h4 className="font-semibold mb-1">{t('howToPlayDialog.chestsTitle')}</h4>
                            <p>{t('howToPlayDialog.chestsText')}</p>
                        </div>
                         <Image src="https://placehold.co/400x250.png" alt="A piece opening a chest" width={400} height={250} className="rounded-md" data-ai-hint="treasure chest" />
                    </div>
                     <div className="grid md:grid-cols-2 gap-4 items-center">
                         <div>
                            <h4 className="font-semibold mb-1">{t('howToPlayDialog.wallsTitle')}</h4>
                            <p>{t('howToPlayDialog.wallsText')}</p>
                        </div>
                        <Image src="https://placehold.co/400x250.png" alt="Walls on the game board" width={400} height={250} className="rounded-md" data-ai-hint="stone wall" />
                    </div>
                </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-headline text-lg mb-2 text-primary">{t('howToPlayDialog.pieceMovementsTitle')}</h3>
              <p className="mb-2">{t('howToPlayDialog.pieceMovementsText')}</p>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="font-semibold">♔ {t('pieces.King')}:</span> {t('howToPlayDialog.kingDesc')}</li>
                <li><span className="font-semibold">♕ {t('pieces.Queen')}:</span> {t('howToPlayDialog.queenDesc')}</li>
                <li><span className="font-semibold">♖ {t('pieces.Rook')}:</span> {t('howToPlayDialog.rookDesc')}</li>
                <li><span className="font-semibold">♗ {t('pieces.Bishop')}:</span> {t('howToPlayDialog.bishopDesc')}</li>
                <li><span className="font-semibold">♘ {t('pieces.Knight')}:</span> {t('howToPlayDialog.knightDesc')}</li>
                <li><span className="font-semibold">♙ {t('pieces.Pawn')}:</span> {t('howToPlayDialog.pawnDesc')}
                    <ul className="list-['-_'] list-inside ml-4 mt-1 space-y-1">
                        <li>{t('howToPlayDialog.pawnMove1')}</li>
                        <li>{t('howToPlayDialog.pawnMove2')}</li>
                        <li>{t('howToPlayDialog.pawnMove3')}</li>
                        <li>{t('howToPlayDialog.pawnMove4')}</li>
                    </ul>
                </li>
              </ul>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>{t('howToPlayDialog.closeButton')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
