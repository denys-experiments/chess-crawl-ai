
import { useState } from 'react';
import type { Piece, PieceType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PawPrint, Glasses, Loader2, Wand2, ChevronsUpDown, RotateCcw, HelpCircle, Globe } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from '@/context/i18n';
import type { LocaleKey } from '@/context/i18n';


interface GameHudProps {
  currentTurn: string;
  level: number;
  inventory: { pieces: Piece[], cosmetics: string[] };
  history: string[];
  isEnemyThinking: boolean;
  selectedPiece: Piece | null;
  onRegenerateLevel: (width: number, height: number, numFactions: number) => void;
  onWinLevel: () => void;
  onCreatePiece: (pieceType: PieceType) => void;
  onPromotePawn: () => void;
  onAwardCosmetic: () => void;
  onRestart: () => void;
  debugLog: string;
  onShowHelp: () => void;
}

function PieceInfoPanel({ piece }: { piece: Piece }) {
    const { t } = useTranslation();
    const cosmeticName = piece.cosmetic
        ? piece.cosmetic.charAt(0).toUpperCase() + piece.cosmetic.slice(1)
        : t('hud.pieceInfo.cosmeticNone');

    return (
        <div className="space-y-3 mb-6">
            <div className="p-4 border rounded-lg bg-background/50">
                <h4 className="font-headline text-lg text-primary text-center mb-3">{piece.name}</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <div className="font-semibold text-muted-foreground">{t('hud.pieceInfo.pieceType')}</div>
                    <div className="text-right">{t(`pieces.${piece.piece}`)}</div>
                    
                    <div className="font-semibold text-muted-foreground">{t('hud.pieceInfo.cosmetic')}</div>
                    <div className="text-right">{cosmeticName}</div>

                    <div className="font-semibold text-muted-foreground">{t('hud.pieceInfo.discovered')}</div>
                    <div className="text-right">{t('hud.pieceInfo.discoveredOn', { level: piece.discoveredOnLevel })}</div>

                    <div className="font-semibold text-muted-foreground">{t('hud.pieceInfo.captures')}</div>
                    <div className="text-right">{piece.captures}</div>
                </div>
            </div>
            <Separator />
        </div>
    );
}

export function GameHud(props: GameHudProps) {
  const { currentTurn, level, inventory, history, isEnemyThinking, selectedPiece, onRestart, onShowHelp } = props;
  const { t, locale, setLocale } = useTranslation();
  const [isCheatsOpen, setIsCheatsOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const getTurnText = () => {
    if (currentTurn === 'player') {
      return t('hud.playerTurn');
    }
    const factionName = currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1);
    return t('hud.enemyTurn', { faction: factionName });
  };

  return (
    <>
      <Card className="w-full md:w-96 md:max-w-sm flex-shrink-0 bg-card/50 backdrop-blur-sm border-primary/30">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-3xl">{t('hud.title')}</CardTitle>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShowHelp}>
                    <HelpCircle className="h-5 w-5" />
                    <span className="sr-only">{t('hud.howToPlay')}</span>
                </Button>
                <Badge variant="secondary" className="text-lg">{t('hud.level', { level })}</Badge>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <CardDescription className="flex items-center gap-2 p-0">
                {isEnemyThinking ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{t('hud.enemyThinking')}</span>
                    </>
                ) : (
                    <span className={`text-xl font-semibold ${currentTurn === 'player' ? 'text-accent' : 'text-destructive'}`}>
                        {getTurnText()}
                    </span>
                )}
            </CardDescription>

             <Select value={locale} onValueChange={(v) => setLocale(v as LocaleKey)}>
                <SelectTrigger className="w-auto h-8 text-xs gap-1.5 pl-2 pr-1" aria-label={t('hud.language')}>
                    <Globe className="h-3 w-3" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="en">🇬🇧 {t('hud.english')}</SelectItem>
                    <SelectItem value="ua">🇺🇦 {t('hud.ukrainian')}</SelectItem>
                    <SelectItem value="dbg">🐛 {t('hud.debug')}</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedPiece && <PieceInfoPanel piece={selectedPiece} />}
          <div>
            <h4 className="font-headline text-lg mb-2 text-primary">{t('hud.inventory')}</h4>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-muted-foreground" />
                  <span>{t('hud.allies', { count: inventory.pieces.length })}</span>
               </div>
               <div className="flex items-center gap-2">
                  <Glasses className="w-5 h-5 text-muted-foreground" />
                  <span>{t('hud.cosmetics', { count: inventory.cosmetics.length })}</span>
               </div>
            </div>
          </div>
          <div>
              <h4 className="font-headline text-lg mb-2 text-primary">{t('hud.history')}</h4>
              <ScrollArea className="h-48 w-full rounded-md border bg-background/50 p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-code">{history.join('\n') || t('hud.historyPlaceholder')}</pre>
              </ScrollArea>
          </div>
          
          <Collapsible open={isCheatsOpen} onOpenChange={setIsCheatsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <Wand2 className="mr-2 h-4 w-4" />
                <span>{t('hud.cheats')}</span>
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="py-4 border-t border-border mt-4">
               <CheatPanel {...props} />
            </CollapsibleContent>
          </Collapsible>
          
          <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setIsResetDialogOpen(true)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('hud.restartGame')}
          </Button>

        </CardContent>
      </Card>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('hud.resetDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('hud.resetDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('hud.resetDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onRestart} className={buttonVariants({ variant: "destructive" })}>
              {t('hud.resetDialog.restart')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CheatPanel({ onRegenerateLevel, onCreatePiece, onPromotePawn, onAwardCosmetic, onWinLevel, debugLog }: {
  onRegenerateLevel: (width: number, height: number, numFactions: number) => void;
  onCreatePiece: (pieceType: PieceType) => void;
  onPromotePawn: () => void;
  onAwardCosmetic: () => void;
  onWinLevel: () => void;
  debugLog: string;
}) {
  const { t } = useTranslation();
  const [width, setWidth] = useState('8');
  const [height, setHeight] = useState('8');
  const [numFactions, setNumFactions] = useState('1');
  const [pieceType, setPieceType] = useState<PieceType>('Knight');

  const handleRegenerate = () => {
    const parsedWidth = parseInt(width, 10);
    const parsedHeight = parseInt(height, 10);
    const parsedFactions = parseInt(numFactions, 10);
    const finalWidth = !isNaN(parsedWidth) && parsedWidth >= 5 ? parsedWidth : 8;
    const finalHeight = !isNaN(parsedHeight) && parsedHeight >= 5 ? parsedHeight : 8;
    const finalFactions = !isNaN(parsedFactions) && parsedFactions > 0 ? parsedFactions : 1;
    onRegenerateLevel(finalWidth, finalHeight, finalFactions);
  };

  return (
    <div className="space-y-4">
       <h4 className="font-headline text-lg text-primary">{t('hud.cheatsPanel.title')}</h4>
      <div className="space-y-2">
        <Label htmlFor="width-input">{t('hud.cheatsPanel.regenerateLevel')}</Label>
        <div className="flex gap-2 items-center flex-wrap">
          <Input id="width-input" type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-16" />
          <span className="text-muted-foreground">x</span>
          <Input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-16" />
          <div className="flex items-center gap-2">
            <Label htmlFor="factions-input" className="text-muted-foreground">{t('hud.cheatsPanel.factions')}</Label>
            <Input id="factions-input" type="number" value={numFactions} onChange={e => setNumFactions(e.target.value)} className="w-14" />
          </div>
          <Button onClick={handleRegenerate} size="sm">{t('hud.cheatsPanel.go')}</Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('hud.cheatsPanel.createPiece')}</Label>
        <div className="flex gap-2">
          <Select value={pieceType} onValueChange={(v) => setPieceType(v as PieceType)}>
            <SelectTrigger>
              <SelectValue placeholder={t('hud.cheatsPanel.selectPiece')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pawn">{t('pieces.Pawn')}</SelectItem>
              <SelectItem value="Knight">{t('pieces.Knight')}</SelectItem>
              <SelectItem value="Bishop">{t('pieces.Bishop')}</SelectItem>
              <SelectItem value="Rook">{t('pieces.Rook')}</SelectItem>
              <SelectItem value="Queen">{t('pieces.Queen')}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => onCreatePiece(pieceType)} size="sm">{t('hud.cheatsPanel.create')}</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onWinLevel} variant="outline" size="sm">{t('hud.cheatsPanel.winLevel')}</Button>
        <Button onClick={onPromotePawn} variant="outline" size="sm">{t('hud.cheatsPanel.promotePawn')}</Button>
        <Button onClick={onAwardCosmetic} variant="outline" size="sm">{t('hud.cheatsPanel.awardCosmetic')}</Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="debug-output">{t('hud.cheatsPanel.debugLog')}</Label>
        <Textarea
          id="debug-output"
          readOnly
          value={debugLog}
          className="h-48 font-mono text-xs bg-background/50"
          placeholder={t('hud.cheatsPanel.debugPlaceholder')}
        />
      </div>
    </div>
  )
}
