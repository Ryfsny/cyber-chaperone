import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import scene2Bg from '@/assets/scene2-situationroom.png';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 900),
      setTimeout(() => setPhase(2), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background */}
      <motion.img
        src={scene2Bg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 5, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f2e]/80 via-[#1a1f2e]/30 to-[#1a1f2e]/60" />

      {/* Left: Status panel */}
      <motion.div
        className="absolute left-10 top-1/2 -translate-y-1/2 flex flex-col gap-5"
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 18 }}
      >
        <div className="bg-[#1a1f2e]/90 border border-[#22c55e]/40 rounded-2xl px-8 py-5 backdrop-blur-sm shadow-2xl">
          <p className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-3">Situation Room</p>

          <motion.div
            className="flex items-center gap-4 mb-4"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-5 h-5 rounded-full bg-[#22c55e] shadow-[0_0_12px_#22c55e]" />
            <span className="text-[#22c55e] text-2xl font-black tracking-wide">STATUS: GREEN</span>
          </motion.div>

          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-3">
              <span className="text-[#22c55e]">✓</span> Tracking active
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#22c55e]">✓</span> Last check-in: 12 min ago
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#22c55e]">✓</span> ETA on track
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right: headline */}
      <motion.div
        className="absolute right-10 top-1/2 -translate-y-1/2 max-w-lg text-right"
        initial={{ x: 80, opacity: 0 }}
        animate={phase >= 1 ? { x: 0, opacity: 1 } : { x: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <h2
          className="text-white text-5xl font-black leading-tight mb-4 drop-shadow-2xl"
          style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 4px 24px rgba(0,0,0,0.9)' }}
        >
          Cyber Chaperone is<br />
          <span className="text-[#22c55e]">watching every step.</span>
        </h2>
        <motion.p
          className="text-gray-200 text-xl font-light leading-relaxed drop-shadow-lg"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          A dedicated operator monitors the journey in real-time, 24/7.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
