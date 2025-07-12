
"use client";

import { useMemo } from 'react';
import { GameBoard } from '@/components/game/board';
import { GameHud } from '@/components/game/hud';
import { Loader2 } from 'lucide-react';
import { LevelCompleteDialog } from '@/components/game/level-complete-dialog';
import { GameOverDialog } from '@/components/game/game-over-dialog';
import { HowToPlayDialog } from '@/components/game/how-to-play-dialog';
import { useGame } from '@/hooks/use-game';
import { useTranslation } from '@/context/i18n';

export default function Home() {
  const {
    state,
    actions,
  } = useGame();
  
  const { getPieceDisplayName } = useTranslation();

  const {
    level,
    board,
    selectedPiece,
    availableMoves,
    playerPieces,
    inventory,
    history,
    isLevelComplete,
    isGameOver,
    isLoading,
    isEnemyThinking,
    isKingInCheck,
    debugLog,
    currentTurn,
    isHelpOpen,
    isSoundEnabled,
  } = state;

  const {
    handleTileClick,
    restartGame,
    handleCarryOver,
    setIsHelpOpen,
    setIsSoundEnabled,
    handleRegenerateLevel,
    handleWinLevel,
    handleCreatePiece,
    handlePromotePawn,
    handleAwardCosmetic,
  } = actions;

  const selectedPieceData = useMemo(() => {
    if (selectedPiece && board) {
        const tile = board[selectedPiece.y][selectedPiece.x];
        if (tile?.type === 'piece' && tile.color === 'white') {
            return tile;
        }
    }
    return null;
  }, [selectedPiece, board]);
  
  if (isLoading || !board) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
        <div className="flex-grow flex items-center justify-center">
          <GameBoard
            board={board}
            onTileClick={handleTileClick}
            selectedPiece={selectedPiece}
            availableMoves={availableMoves}
            isLoading={isLoading}
            isKingInCheck={isKingInCheck}
          />
        </div>
        <GameHud 
          currentTurn={currentTurn}
          level={level}
          inventory={inventory}
          history={history}
          isEnemyThinking={isEnemyThinking}
          selectedPiece={selectedPieceData}
          onRegenerateLevel={handleRegenerateLevel}
          onWinLevel={handleWinLevel}
          onCreatePiece={handleCreatePiece}
          onPromotePawn={handlePromotePawn}
          onAwardCosmetic={handleAwardCosmetic}
          onRestart={restartGame}
          debugLog={debugLog}
          onShowHelp={() => setIsHelpOpen(true)}
          isSoundEnabled={isSoundEnabled}
          onToggleSound={setIsSoundEnabled}
        />
      </div>
      <LevelCompleteDialog 
        isOpen={isLevelComplete}
        level={level}
        playerPieces={playerPieces}
        onNextLevel={handleCarryOver}
        getPieceDisplayName={getPieceDisplayName}
      />
      <GameOverDialog 
        isOpen={isGameOver}
        onRestart={restartGame}
      />
      <HowToPlayDialog
        isOpen={isHelpOpen}
        onOpenChange={setIsHelpOpen}
      />
    </main>
  );
}
