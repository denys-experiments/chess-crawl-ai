
import { en } from '@/locales/en';

const NUM_FIRST_NAMES = en.nameParts.firstNames.length;
const NUM_LAST_NAMES = en.nameParts.lastNames.length;

export function generateRandomName(): { firstNameIndex: number; lastNameIndex: number; } {
    const firstNameIndex = Math.floor(Math.random() * NUM_FIRST_NAMES);
    const lastNameIndex = Math.floor(Math.random() * NUM_LAST_NAMES);
    return { firstNameIndex, lastNameIndex };
}
