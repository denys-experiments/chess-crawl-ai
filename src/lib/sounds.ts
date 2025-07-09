
"use client";

let audioContext: AudioContext | null = null;

// This function needs to be called after a user interaction
export const initAudioContext = () => {
    if (typeof window === 'undefined') return;

    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }
    }
    
    // On some browsers, the AudioContext starts in a 'suspended' state
    // and needs to be resumed after a user interaction.
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
};

const playNote = (frequency: number, duration: number, volume: number, type: OscillatorType, delay: number = 0) => {
    if (!audioContext || audioContext.state !== 'running') return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime + delay);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + delay + 0.02);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + delay);
    
    oscillator.start(audioContext.currentTime + delay);
    
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + delay + duration);
    oscillator.stop(audioContext.currentTime + delay + duration);
};

export const playSound = (soundType: 'move' | 'capture' | 'check' | 'win' | 'lose') => {
    if (typeof window === 'undefined' || !audioContext || audioContext.state !== 'running') {
        // Silently fail if audio context is not ready. 
        // It will be initialized on the next user click.
        return;
    }

    switch (soundType) {
        case 'move':
            // A short, soft click
            playNote(600, 0.1, 0.05, 'sine');
            break;
        case 'capture':
            // A slightly lower, harsher sound
            playNote(400, 0.15, 0.08, 'square');
            break;
        case 'check':
            // A short, high-pitched warning sound
            playNote(1200, 0.15, 0.1, 'triangle');
            break;
        case 'win':
            // A pleasant ascending arpeggio
            playNote(523.25, 0.1, 0.1, 'sine', 0);     // C5
            playNote(659.25, 0.1, 0.1, 'sine', 0.1);   // E5
            playNote(783.99, 0.1, 0.1, 'sine', 0.2);   // G5
            playNote(1046.50, 0.2, 0.1, 'sine', 0.3);  // C6
            break;
        case 'lose':
            // A dissonant, descending sound
            playNote(200, 0.4, 0.1, 'sawtooth', 0);
            playNote(190, 0.4, 0.1, 'sawtooth', 0.05);
            break;
    }
};
