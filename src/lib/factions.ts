// Casual to threatening: black, orange, cyan, red, purple
export const ENEMY_FACTION_COLORS: string[] = ['black', 'orange', 'cyan', 'red', 'purple'];

/**
 * Determines the enemy factions present for a given level.
 * @param level The current game level.
 * @param count Optional. If provided, returns a specific number of factions.
 * @returns An array of faction color strings.
 */
export function getFactionsForLevel(level: number, count?: number): string[] {
  if (count) {
    return ENEMY_FACTION_COLORS.slice(0, Math.min(count, ENEMY_FACTION_COLORS.length));
  }

  if (level === 1) {
    return [ENEMY_FACTION_COLORS[0]];
  }

  // Number of factions increases with level.
  // Level 1-3: 1 faction
  // Level 4-7: 2 factions
  // Level 8-11: 3 factions etc.
  const baseFactions = 1 + Math.floor((level - 1) / 4);
  
  // Add some randomness, but don't exceed the max.
  const randomFactor = Math.random() > 0.6 ? 1 : 0;
  const numFactions = Math.min(ENEMY_FACTION_COLORS.length, baseFactions + randomFactor);

  return ENEMY_FACTION_COLORS.slice(0, numFactions);
}
