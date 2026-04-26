import { useCallback, useRef } from 'react';

interface VoiceOptions {
  enabled:  boolean;
  rate?:    number;
  pitch?:   number;
  volume?:  number;
}

export function useAuctionVoice(options: VoiceOptions) {
  const { enabled, rate = 0.9, pitch = 1.0, volume = 1.0 } = options;
  const speaking = useRef(false);
  const queue    = useRef<string[]>([]);

  const processQueue = useCallback(() => {
    if (speaking.current || queue.current.length === 0) return;
    const text = queue.current.shift()!;
    const utterance = new SpeechSynthesisUtterance(text);

    // Pick a good voice — prefer Indian English if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang === 'en-IN' || v.name.includes('India')
    ) || voices.find(v =>
      v.lang.startsWith('en')
    ) || voices[0];

    if (preferred) utterance.voice = preferred;

    utterance.rate   = rate;
    utterance.pitch  = pitch;
    utterance.volume = volume;

    utterance.onstart = () => { speaking.current = true; };
    utterance.onend   = () => {
      speaking.current = false;
      setTimeout(processQueue, 300); // small gap between announcements
    };
    utterance.onerror = () => {
      speaking.current = false;
      setTimeout(processQueue, 300);
    };

    window.speechSynthesis.speak(utterance);
  }, [rate, pitch, volume]);

  const announce = useCallback((text: string) => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    queue.current.push(text);
    processQueue();
  }, [enabled, processQueue]);

  const announceNewBid = useCallback((
    amount:    number,
    bidder:    string,
    totalBids: number
  ) => {
    const fmt = (n: number) =>
      n >= 10000000 ? `${(n / 10000000).toFixed(1)} crore rupees` :
      n >= 100000   ? `${(n / 100000).toFixed(1)} lakh rupees`    :
      n >= 1000     ? `${(n / 1000).toFixed(0)} thousand rupees`  :
      `${n} rupees`;

    const phrases = [
      `We have ${fmt(amount)} from ${bidder}! Do I hear higher?`,
      `${bidder} bids ${fmt(amount)}! Any advance?`,
      `${fmt(amount)} on the table from ${bidder}. Going once?`,
      `New bid! ${fmt(amount)} by ${bidder}. Who goes higher?`,
    ];

    const phrase = phrases[totalBids % phrases.length];
    announce(phrase);
  }, [announce]);

  const announceAuctionStart = useCallback((landTitle: string) => {
    announce(`Attention! The auction for ${landTitle} is now live. Bidding is open!`);
  }, [announce]);

  const announceWarning = useCallback((minutesLeft: number) => {
    if (minutesLeft === 5)  announce('Five minutes remaining! Place your final bids!');
    if (minutesLeft === 1)  announce('One minute left! Last chance to bid!');
    if (minutesLeft === 0)  announce('Bidding is now closed. Thank you all for participating.');
  }, [announce]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      queue.current    = [];
      speaking.current = false;
    }
  }, []);

  return { announce, announceNewBid, announceAuctionStart, announceWarning, stop };
}