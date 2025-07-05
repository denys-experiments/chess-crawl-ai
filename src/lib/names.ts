
const FIRST_NAMES = [
    'Alex', 'Bobbie', 'Casey', 'Drew', 'Eddie', 'Frankie', 'Gray', 'Harley',
    'Jamie', 'Jordan', 'Kai', 'Leslie', 'Morgan', 'Pat', 'Quinn', 'Riley',
    'Rowan', 'Sam', 'Taylor', 'Vic', 'Ash', 'Blair', 'Cameron', 'Dakota',
    'Emerson', 'Finley', 'Hayden', 'Indigo', 'Jesse', 'Kendall', 'Logan',
    'Marlowe', 'Noel', 'Parker', 'Reagan', 'Sawyer', 'Skyler', 'Tatum', 'Winter'
];

const LAST_NAMES = [
    'the Valiant', 'the Bold', 'the Swift', 'the Clever', 'the Mighty',
    'the Steadfast', 'the Wise', 'the Just', 'the Fearless', 'the Gentle',
    'the Bright', 'the Grim', 'the Silent', 'of the Hills', 'of the River',
    'of the Forest', 'of the Mountain', 'of the Sky', 'of the Stars', 'of the Depths',
    'Ironheart', 'Shadowend', 'Stormcaller', 'Sunstrider', 'Moonwhisper',
    'Stonehand', 'Lightbringer', 'Voidgazer', 'Firebrand', 'Winterborn'
];

export function generateRandomName(): string {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return `${firstName} ${lastName}`;
}
