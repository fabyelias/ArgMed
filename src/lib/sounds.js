const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export const playAlertSound = () => {
  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const t = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // "Digital Phone Ring" style
    oscillator.type = 'sine';
    
    // Pattern: High-Low-High-Low (Classic digital ring)
    // Note 1
    oscillator.frequency.setValueAtTime(880, t); // A5
    gainNode.gain.setValueAtTime(0.1, t);
    gainNode.gain.setValueAtTime(0.1, t + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, t + 0.15);

    // Note 2
    oscillator.frequency.setValueAtTime(659.25, t + 0.2); // E5
    gainNode.gain.setValueAtTime(0, t + 0.2);
    gainNode.gain.linearRampToValueAtTime(0.1, t + 0.21);
    gainNode.gain.setValueAtTime(0.1, t + 0.3);
    gainNode.gain.linearRampToValueAtTime(0, t + 0.35);

    // Note 3 (Repeat 1)
    oscillator.frequency.setValueAtTime(880, t + 0.4);
    gainNode.gain.setValueAtTime(0, t + 0.4);
    gainNode.gain.linearRampToValueAtTime(0.1, t + 0.41);
    gainNode.gain.setValueAtTime(0.1, t + 0.5);
    gainNode.gain.linearRampToValueAtTime(0, t + 0.55);

    // Note 4 (Repeat 2 - Long)
    oscillator.frequency.setValueAtTime(659.25, t + 0.6);
    gainNode.gain.setValueAtTime(0, t + 0.6);
    gainNode.gain.linearRampToValueAtTime(0.1, t + 0.61);
    gainNode.gain.setValueAtTime(0.1, t + 0.8); // Sustain longer
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

    oscillator.start(t);
    oscillator.stop(t + 1.0);

  } catch (error) {
    console.error("Audio playback failed:", error);
  }
};

export const playNotificationSound = () => {
    try {
        if (audioContext.state === 'suspended') audioContext.resume();
        const t = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
    } catch (e) {}
};