import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import scene1Bg from '@/assets/scene1-forest.png';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3200),
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
      {/* Background illustration */}
      <motion.img
        src={scene1Bg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      />

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1f2e]/70 via-[#1a1f2e]/20 to-[#1a1f2e]/80" />

      {/* Top badge + title */}
      <motion.div
        className="absolute top-10 left-0 right-0 flex flex-col items-center gap-4 px-8"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 110 }}
      >
        <div className="bg-[#22c55e] text-[#1a1f2e] text-sm font-black px-5 py-2 rounded-full tracking-widest uppercase shadow-lg">
          Cyber Chaperone
        </div>
        <h1
          className="text-white text-6xl font-black text-center drop-shadow-2xl leading-tight"
          style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 4px 24px rgba(0,0,0,0.8)' }}
        >
          Are You Going<br />to Granny's?
        </h1>
      </motion.div>

      {/* WhatsApp message bubble */}
      <motion.div
        className="absolute bottom-36 left-1/2 -translate-x-1/2 w-full max-w-sm"
        initial={{ scale: 0.6, opacity: 0, y: 20 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.6, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      >
        <div className="bg-white rounded-2xl rounded-bl-sm shadow-2xl px-6 py-4 mx-4">
          <p className="text-xs font-bold text-[#22c55e] mb-1.5">Little Red 🧒</p>
          <p className="text-[#1a1f2e] text-lg font-semibold">On my way to Granny. ETA 2 hours. 📍</p>
          <p className="text-xs text-gray-400 text-right mt-1.5">3:42 PM ✓✓</p>
        </div>
      </motion.div>

      {/* Shield activated */}
      <motion.div
        className="absolute bottom-8 right-16 flex flex-col items-center gap-2"
        initial={{ scale: 0, opacity: 0 }}
        animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
      >
        <motion.div
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-24 bg-[#22c55e] rounded-b-full flex items-center justify-center border-4 border-[#16a34a] shadow-[0_0_40px_rgba(34,197,94,0.7)]"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </motion.div>
        <motion.span
          className="text-[#22c55e] text-xs font-black tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          Protected
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
