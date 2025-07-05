# **App Name**: Chess Crawl

## Core Features:

- Dungeon Board Generation: Generate a random chess board layout resembling a roguelike dungeon.
- Chess Rules with Modifications: Standard chess piece movement with an indicator for unsafe King moves. Pawns can change direction by 'pushing off' adjacent pieces or walls.
- Rescue Allies: Rescue sleeping friendly pieces (different color) by moving adjacent to them.
- Loot Chests: Find chests containing cosmetic items for pieces (tutus, sunglasses) or pawn promotions.
- Enemy AI: Multiple enemy factions with a simple AI that calculates 1-3 moves forward to decide on optimal placement of their pieces with respect to the other ones and the player's.
- Piece Carry-Over: Option to bring a limited number of pieces to the next level upon level completion. This 'tool' also tracks your inventory from previous levels.
- User Controls: Lichess/Chess.com style controls optimized for mouse and touch input.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) to evoke a sense of mystery and depth, reflecting the dungeon theme.
- Background color: Dark gray (#303030), providing contrast and fitting a dark theme.
- Accent color: Electric blue (#3F51B5), used for highlighting interactive elements and important information.
- Body and headline font: 'Space Grotesk' (sans-serif) for a modern, slightly techy, and readable UI.
- Code font: 'Source Code Pro' for displaying game logic or any debug information, such as used for an LLM 'tool'.
- Icons with a hand-drawn, whimsical style to enhance the roguelike aesthetic.
- Subtle animations for piece movements, captures, and chest openings to provide visual feedback without overwhelming the player.