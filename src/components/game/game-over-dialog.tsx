
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from '@/context/i18n';

interface GameOverDialogProps {
    isOpen: boolean;
    onRestart: () => void;
}

export function GameOverDialog({ isOpen, onRestart }: GameOverDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('gameOverDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('gameOverDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onRestart}>{t('gameOverDialog.button')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
