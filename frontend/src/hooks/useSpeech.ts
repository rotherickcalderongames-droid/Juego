import { useState, useEffect, useCallback } from 'react';

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  const speak = useCallback((text: string) => {
    if (!supported || !text) return;

    // Cancel current speaking
    window.speechSynthesis.cancel();

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to select a Spanish voice (preferably male/robotic, or the first Spanish one available)
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(voice => voice.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    // Cybersecurity System Voice configuration (Slightly slow and deep)
    utterance.pitch = 0.4; // Low pitch for cyborg/synth voice
    utterance.rate = 0.95; // Slightly slow speaking rate

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('[Web Speech API] Speak error:', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [supported]);

  // Handle browser voice list loading asynchronously
  useEffect(() => {
    if (!supported) return;
    const handleVoicesChanged = () => {
      // Just forces a reload of voices internally
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, [supported]);

  return {
    speak,
    stop,
    isSpeaking,
    supported
  };
}
