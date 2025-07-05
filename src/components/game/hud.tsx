import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PawPrint, Glasses, Loader2 } from 'lucide-react';
import type { Piece } from '@/types';

interface GameHudProps {
  turn: 'player' | 'enemy';
  level: number;
  inventory: { pieces: Piece[], cosmetics: string[] };
  aiReasoning: string;
  isLoading: boolean;
}

export function GameHud({ turn, level, inventory, aiReasoning, isLoading }: GameHudProps) {
  return (
    <Card className="w-full md:w-96 md:max-w-sm flex-shrink-0 bg-card/50 backdrop-blur-sm border-primary/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="font-headline text-3xl">Chess Crawl</CardTitle>
          <Badge variant="secondary" className="text-lg">Level {level}</Badge>
        </div>
        <CardDescription className="flex items-center gap-2 pt-2">
            {isLoading ? (
                <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Enemy is thinking...</span>
                </>
            ) : (
                <span className={`text-xl font-semibold ${turn === 'player' ? 'text-accent' : 'text-destructive'}`}>
                    {turn === 'player' ? "Player's Turn" : "Enemy's Turn"}
                </span>
            )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-headline text-lg mb-2 text-primary">Inventory</h4>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-muted-foreground" />
                <span>Allies: {inventory.pieces.length}</span>
             </div>
             <div className="flex items-center gap-2">
                <Glasses className="w-5 h-5 text-muted-foreground" />
                <span>Cosmetics: {inventory.cosmetics.length}</span>
             </div>
          </div>
        </div>
        <div>
            <h4 className="font-headline text-lg mb-2 text-primary">AI Thoughts</h4>
            <ScrollArea className="h-64 w-full rounded-md border bg-background/50 p-4">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-code">{aiReasoning || 'Waiting for enemy move...'}</pre>
            </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
