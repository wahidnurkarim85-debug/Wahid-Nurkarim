import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, Music } from 'lucide-react';

export const AudioWelcomeManager: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [speechDone, setSpeechDone] = useState<boolean>(false);
  const [audioStarted, setAudioStarted] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const loopIntervalRef = useRef<number | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Inisialisasi AudioContext Web Audio (100% Legal & Bebas Hak Cipta di Indonesia)
  const getAudioContext = (): AudioContext => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      
      const masterGain = audioCtxRef.current.createGain();
      masterGain.gain.setValueAtTime(0.0001, audioCtxRef.current.currentTime);
      masterGain.connect(audioCtxRef.current.destination);
      masterGainRef.current = masterGain;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Mainkan satu nada lembut sintetis (hangat & ramah gaya gamelan akustik)
  const playTone = (freq: number, startTime: number, duration: number, peakVol: number = 0.08) => {
    try {
      const ctx = audioCtxRef.current;
      const master = masterGainRef.current;
      if (!ctx || !master) return;

      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Filter nada hangat agar lembut di telinga & speaker HP Android
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, startTime);
      filter.frequency.exponentialRampToValueAtTime(300, startTime + duration);

      osc.type = 'triangle'; // Nada lembut menyerupai marimba / gamelan akustik
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope ADSR lembut
      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.linearRampToValueAtTime(peakVol, startTime + 0.04);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(master);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    } catch {
      // ignore
    }
  };

  // Mulai Backsound Loop dengan Fade-In bertahap dari pelan ke volume nyaman
  const startBacksoundLoop = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx || !masterGainRef.current) return;

      // Fade-in dari pelan (0.0001) ke tingkat nyaman (0.18) dalam 3 detik
      const now = ctx.currentTime;
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.setValueAtTime(0.0001, now);
      masterGainRef.current.gain.linearRampToValueAtTime(0.18, now + 3.0);

      setIsPlaying(true);
      setIsMuted(false);

      // Skala nada pentatonik damai Koperasi Desa (C4, D4, E4, G4, A4, C5, D5)
      // Bebas hak cipta, legal secara hukum, santai dan menyenangkan
      const notes = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        392.00, // G4
        440.00, // A4
        523.25, // C5
        587.33, // D5
        659.25, // E5
      ];

      // Pola melodi arpeggio santai per 8 ketukan
      const playPhrase = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
        const baseTime = audioCtxRef.current.currentTime + 0.05;
        const tempo = 0.55; // detik per ketukan

        const melody = [
          { noteIdx: 0, time: 0, dur: 1.2, vol: 0.10 },
          { noteIdx: 2, time: tempo * 1, dur: 1.0, vol: 0.08 },
          { noteIdx: 3, time: tempo * 2, dur: 1.1, vol: 0.09 },
          { noteIdx: 4, time: tempo * 3, dur: 1.4, vol: 0.11 },
          { noteIdx: 5, time: tempo * 4, dur: 1.2, vol: 0.09 },
          { noteIdx: 3, time: tempo * 5, dur: 0.9, vol: 0.08 },
          { noteIdx: 2, time: tempo * 6, dur: 1.0, vol: 0.07 },
          { noteIdx: 1, time: tempo * 7, dur: 1.5, vol: 0.08 },
        ];

        melody.forEach((item) => {
          const freq = notes[item.noteIdx] || 261.63;
          playTone(freq, baseTime + item.time, item.dur, item.vol);
        });
      };

      playPhrase();
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = window.setInterval(playPhrase, 4400);
    } catch (err) {
      console.warn('Gagal memulai backsound:', err);
    }
  };

  // Jalankan Suara Pembuka Wanita (TTS Bahasa Indonesia)
  const speakWelcomeVoice = () => {
    if (!('speechSynthesis' in window)) {
      // Jika browser tidak mendukung TTS, langsung masuk ke backsound setelah 2 detik
      setTimeout(() => {
        startBacksoundLoop();
      }, 2000);
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Bersihkan antrian sebelumnya

      const text = 'Selamat datang di Koperasi Desa Merah Putih Cengkareng Timur.';
      const utterance = new SpeechSynthesisUtterance(text);
      speechUtteranceRef.current = utterance;

      utterance.lang = 'id-ID';
      utterance.rate = 0.92; // Kecepatan bicara ramah dan jelas
      utterance.pitch = 1.15; // Karakter suara wanita hangat

      // Cari suara wanita / Bahasa Indonesia yang tersedia di browser
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) => 
        v.lang.includes('id') || 
        v.lang.includes('ID') || 
        v.name.toLowerCase().includes('indonesia') ||
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('gadis') ||
        v.name.toLowerCase().includes('damayanti')
      );
      if (idVoice) {
        utterance.voice = idVoice;
      }

      // ⏱️ Setelah suara selesai, tunggu 2 detik, lalu backsound mulai otomatis dengan fade-in
      utterance.onend = () => {
        setSpeechDone(true);
        setTimeout(() => {
          startBacksoundLoop();
        }, 2000);
      };

      utterance.onerror = () => {
        setSpeechDone(true);
        setTimeout(() => {
          startBacksoundLoop();
        }, 2000);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback jika ada pembatasan
      setTimeout(() => {
        startBacksoundLoop();
      }, 2000);
    }
  };

  // Urutan Autoplay Lengkap
  const executeAutoplaySequence = () => {
    if (audioStarted) return;
    setAudioStarted(true);
    getAudioContext();
    speakWelcomeVoice();
  };

  // Pemicu saat pertama kali halaman dimuat (Autoplay penuh dioptimalkan untuk Android)
  useEffect(() => {
    // Jalankan segera
    const timer = setTimeout(() => {
      executeAutoplaySequence();
    }, 600);

    // HP Android/iOS policy: jika autoplay terblokir oleh browser sebelum ada interaksi,
    // ketukan pertama pada layar otomatis mengaktifkannya seketika
    const handleFirstUserGesture = () => {
      executeAutoplaySequence();
      window.removeEventListener('pointerdown', handleFirstUserGesture);
      window.removeEventListener('touchstart', handleFirstUserGesture);
      window.removeEventListener('click', handleFirstUserGesture);
    };

    window.addEventListener('pointerdown', handleFirstUserGesture, { once: true });
    window.addEventListener('touchstart', handleFirstUserGesture, { once: true });
    window.addEventListener('click', handleFirstUserGesture, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleFirstUserGesture);
      window.removeEventListener('touchstart', handleFirstUserGesture);
      window.removeEventListener('click', handleFirstUserGesture);
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Handler Tombol ON / OFF Suara
  const toggleSound = () => {
    if (!audioStarted) {
      executeAutoplaySequence();
      return;
    }

    if (!isMuted && isPlaying) {
      // Matikan suara (Mute)
      if (masterGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        masterGainRef.current.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      }
      setIsMuted(true);
      setIsPlaying(false);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      // Hidupkan suara (Unmute / Play)
      getAudioContext();
      if (masterGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        masterGainRef.current.gain.linearRampToValueAtTime(0.18, now + 0.5);
      }
      setIsMuted(false);
      setIsPlaying(true);
      if (!loopIntervalRef.current) {
        startBacksoundLoop();
      }
    }
  };

  return (
    <div className="fixed bottom-6 left-4 sm:left-6 z-40 select-none">
      <div className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full border border-slate-700/60 shadow-lg shadow-black/25 transition-all">
        {/* Tombol Utama On/Off */}
        <button
          id="btn-toggle-sound"
          onClick={toggleSound}
          className="flex items-center gap-2 cursor-pointer focus:outline-none"
          title={isPlaying && !isMuted ? "Matikan Suara (Mute)" : "Nyalakan Suara & Backsound"}
        >
          {isPlaying && !isMuted ? (
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <VolumeX className="w-4 h-4 text-red-400" />
            </div>
          )}

          <div className="text-left leading-tight pr-1">
            <div className="text-[10px] sm:text-[11px] font-bold flex items-center gap-1 text-slate-200">
              <span>Musik & Suara</span>
              {isPlaying && !isMuted && (
                <span className="flex items-end gap-0.5 h-2.5">
                  <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                </span>
              )}
            </div>
            <div className="text-[9px] font-medium text-slate-400">
              {isPlaying && !isMuted ? (
                <span className="text-emerald-400 font-bold">Aktif (Loop)</span>
              ) : (
                <span className="text-slate-400">Mati (Klik ON)</span>
              )}
            </div>
          </div>
        </button>

        {/* Tombol Mini Re-play Salam Wanita */}
        <button
          onClick={() => {
            getAudioContext();
            setIsMuted(false);
            speakWelcomeVoice();
          }}
          className="ml-1 pl-2 border-l border-slate-700/80 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          title="Ulangi Salam Suara Wanita Koperasi"
        >
          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="hidden xs:inline">Salam</span>
        </button>
      </div>
    </div>
  );
};
