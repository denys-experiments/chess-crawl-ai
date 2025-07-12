
"use client";

import { useCallback } from 'react';
import type { UseGameStateReturn } from './use-game-state';
import type { Piece } from '@/types';

export const SAVE_GAME_KEY = 'chess-crawl-save-game';

interface SaveData {
    level: number;
    board: any;
    currentTurn: string;
    history: any[];
    inventory: { pieces: Piece[], cosmetics: string[] };
}

export function useGamePersistence(getState: UseGameStateReturn['get'], setters: UseGameStateReturn['setters']) {

    const saveGame = useCallback((data?: Partial<SaveData>) => {
        const currentState = getState();
        const stateToSave: SaveData = {
            level: data?.level ?? currentState.level,
            board: data?.board ?? currentState.board,
            currentTurn: data?.currentTurn ?? currentState.currentTurn,
            history: data?.history ?? currentState.history,
            inventory: data?.inventory ?? currentState.inventory,
        };
        try {
            localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Failed to save game state:", error);
        }
    }, [getState]);

    const loadGame = useCallback(() => {
        try {
            const savedGame = localStorage.getItem(SAVE_GAME_KEY);
            if (savedGame) {
                const parsedData: SaveData = JSON.parse(savedGame);
                setters.setLevel(parsedData.level);
                setters.setBoard(parsedData.board);
                setters.setCurrentTurn(parsedData.currentTurn);
                setters.setHistory(parsedData.history || []);
                setters.setInventory(parsedData.inventory || { pieces: [], cosmetics: [] });
                setters.setIsLoading(false);
                return true;
            }
        } catch (error) {
            console.error("Failed to load saved game, starting new game.", error);
            localStorage.removeItem(SAVE_GAME_KEY);
        }
        return false;
    }, [setters]);

    const clearSave = useCallback(() => {
        localStorage.removeItem(SAVE_GAME_KEY);
    }, []);

    return { saveGame, loadGame, clearSave };
}
