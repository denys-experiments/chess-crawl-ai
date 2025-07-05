'use server';
/**
 * @fileOverview Calculates the next move for an enemy chess piece based on a simple AI.
 *
 * - calculateEnemyMove - A function that calculates the enemy's next move.
 * - CalculateEnemyMoveInput - The input type for the calculateEnemyMove function.
 * - CalculateEnemyMoveOutput - The return type for the calculateEnemyMove function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculateEnemyMoveInputSchema = z.object({
  boardState: z.string().describe('A string representation of the current chess board state.'),
  enemyPiecePosition: z.string().describe('The current position of the enemy piece (e.g., a1, b2).'),
  playerPiecePositions: z.array(z.string()).describe('An array of the player pieces positions on the board.'),
  availableMoves: z.array(z.string()).describe('An array of available moves for the given enemy piece.'),
  difficulty: z.enum(['easy', 'normal', 'hard']).describe('The difficulty level of the AI, affecting the move calculation depth.'),
});
export type CalculateEnemyMoveInput = z.infer<typeof CalculateEnemyMoveInputSchema>;

const CalculateEnemyMoveOutputSchema = z.object({
  bestMove: z.string().describe('The calculated best move for the enemy piece.'),
  reasoning: z.string().describe('The AI reasoning behind the chosen move.'),
});
export type CalculateEnemyMoveOutput = z.infer<typeof CalculateEnemyMoveOutputSchema>;

export async function calculateEnemyMove(input: CalculateEnemyMoveInput): Promise<CalculateEnemyMoveOutput> {
  return calculateEnemyMoveFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateEnemyMovePrompt',
  input: {schema: CalculateEnemyMoveInputSchema},
  output: {schema: CalculateEnemyMoveOutputSchema},
  prompt: `You are an expert chess AI, tasked with determining the best move for an enemy piece.

Current Board State: {{{boardState}}}
Enemy Piece Position: {{{enemyPiecePosition}}}
Player Piece Positions: {{#each playerPiecePositions}}{{{this}}} {{/each}}
Available Moves: {{#each availableMoves}}{{{this}}} {{/each}}
Difficulty: {{{difficulty}}}

Based on the current board state, your goal is to select the best move from the available moves for the enemy piece. Consider the player's piece positions, the difficulty level, and attempt to anticipate the player's next move.

Difficulty levels:
- Easy: Calculate 1 move ahead.
- Normal: Calculate 2 moves ahead.
- Hard: Calculate 3 moves ahead.

Provide your reasoning for selecting the best move. Return the best move and reasoning in JSON format.

Output: {
  "bestMove": "<The best move for the enemy piece>",
  "reasoning": "<The AI reasoning behind the chosen move>"
}
`,
});

const calculateEnemyMoveFlow = ai.defineFlow(
  {
    name: 'calculateEnemyMoveFlow',
    inputSchema: CalculateEnemyMoveInputSchema,
    outputSchema: CalculateEnemyMoveOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
