import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import scene5Bg from '@/assets/scene5-arrival.png';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
    >
      {/* Background */}
      <motion.img
        src={scene5Bg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 5, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1f2e]/60 via-transparent to-[#1a1f2e]/80" />

      {/* WhatsApp arrival message */}
      <motion.div
        className="absolute top-12 left-1/2 -translate-x-1/2 max-w-sm w-full px-4"
        initial={{ y: -50, scale: 0.8, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 250, damping: 22 }}
      >
        <div className="bg-[#f0fdf4] rounded-2xl rounded-tr-sm shadow-2xl px-6 py-4">
          <p className="text-xs font-bold text-[#16a34a] mb-1.5 text-right">Little Red 🧒</p>
          <p className="text-[#1a1f2e] text-xl font-bold">I'm here! Safe and sound. 🏡</p>
          <p className="text-xs text-gray-400 text-right mt-1.5">5:38 PM ✓✓</p>
        </div>
      </motion.div>

      {/* Pulsing shield */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-6"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <motion.div
          className="relative flex items-center justify-center"
          animate={phase >= 1 ? {
            filter: ['drop-shadow(0 0 20px #22c55e)', 'drop-shadow(0 0 50px #22c55e)', 'drop-shadow(0 0 20px #22c55e)'],
          } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Ripple rings */}
          {phase >= 1 && [0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-[#22c55e]/40"
              initial={{ width: 100, height: 100, opacity: 0.7 }}
              animate={{ width: 240, height: 240, opacity: 0 }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: i * 0.8,
                ease: 'easeOut',
              }}
            />
          ))}

          <div className="w-28 h-36 bg-[#22c55e] rounded-b-full flex items-center justify-center border-4 border-[#16a34a] shadow-2xl relative overflow-hidden">
            {/* Shine sweep */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 skew-y-6"
              animate={{ y: ['-100%', '300%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
            />
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom tagline */}
      <motion.div
        className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-3"
        initial={{ y: 40, opacity: 0 }}
        animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
      >
        <motion.div
          className="text-[#22c55e] text-4xl font-black tracking-widest uppercase"
          style={{ fontFamily: 'Nunito, sans-serif' }}
          animate={phase >= 3 ? { scale: [1, 1.04, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          eblockwatch
        </motion.div>
        <div className="text-white/90 text-2xl font-light tracking-wide" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
          Nobody travels alone.
        </div>
      </motion.div>
    </motion.div>
  );
}
