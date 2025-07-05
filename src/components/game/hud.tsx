
import { useState } from 'react';
import type { Piece, PieceType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PawPrint, Glasses, Loader2, Wand2, ChevronsUpDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface GameHudProps {
  turn: 'player' | 'enemy';
  level: number;
  inventory: { pieces: Piece[], cosmetics: string[] };
  aiReasoning: string;
  isEnemyThinking: boolean;
  onRegenerateLevel: (width: number, height: number) => void;
  onWinLevel: () => void;
  onCreatePiece: (pieceType: PieceType) => void;
  onPromotePawn: () => void;
  onAwardCosmetic: () => void;
}

export function GameHud(props: GameHudProps) {
  const { turn, level, inventory, aiReasoning, isEnemyThinking } = props;
  const [isCheatsOpen, setIsCheatsOpen] = useState(false);

  return (
    <Card className="w-full md:w-96 md:max-w-sm flex-shrink-0 bg-card/50 backdrop-blur-sm border-primary/30">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="font-headline text-3xl">Chess Crawl</CardTitle>
          <Badge variant="secondary" className="text-lg">Level {level}</Badge>
        </div>
        <CardDescription className="flex items-center gap-2 pt-2">
            {isEnemyThinking ? (
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
            <ScrollArea className="h-48 w-full rounded-md border bg-background/50 p-4">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-code">{aiReasoning || 'Waiting for enemy move...'}</pre>
            </ScrollArea>
        </div>
        
        <Collapsible open={isCheatsOpen} onOpenChange={setIsCheatsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              <Wand2 className="mr-2 h-4 w-4" />
              <span>Cheats</span>
              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="py-4 border-t border-border mt-4">
             <CheatPanel {...props} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function CheatPanel({ onRegenerateLevel, onCreatePiece, onPromotePawn, onAwardCosmetic, onWinLevel }: {
  onRegenerateLevel: (width: number, height: number) => void;
  onCreatePiece: (pieceType: PieceType) => void;
  onPromotePawn: () => void;
  onAwardCosmetic: () => void;
  onWinLevel: () => void;
}) {
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(8);
  const [pieceType, setPieceType] = useState<PieceType>('Knight');

  return (
    <div className="space-y-4">
       <h4 className="font-headline text-lg text-primary">Cheat Panel</h4>
      <div className="space-y-2">
        <Label htmlFor="width-input">Regenerate Level</Label>
        <div className="flex gap-2 items-center">
          <Input id="width-input" type="number" value={width} onChange={e => setWidth(Math.max(5, parseInt(e.target.value)) || 8)} className="w-16" />
          <span className="text-muted-foreground">x</span>
          <Input type="number" value={height} onChange={e => setHeight(Math.max(5, parseInt(e.target.value)) || 8)} className="w-16" />
          <Button onClick={() => onRegenerateLevel(width, height)} size="sm">Go</Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Create Piece</Label>
        <div className="flex gap-2">
          <Select value={pieceType} onValueChange={(v) => setPieceType(v as PieceType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select piece" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pawn">Pawn</SelectItem>
              <SelectItem value="Knight">Knight</SelectItem>
              <SelectItem value="Bishop">Bishop</SelectItem>
              <SelectItem value="Rook">Rook</SelectItem>
              <SelectItem value="Queen">Queen</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => onCreatePiece(pieceType)} size="sm">Create</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onWinLevel} variant="outline" size="sm">Win Level</Button>
        <Button onClick={onPromotePawn} variant="outline" size="sm">Promote Pawn</Button>
        <Button onClick={onAwardCosmetic} variant="outline" size="sm">Award Cosmetic</Button>
      </div>
    </div>
  )
}
