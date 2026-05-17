import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden" {...sceneTransitions.morphExpand}>
      
      {/* Background */}
      <motion.div 
        className="absolute inset-0 bg-[#1a1f2e]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Arrival Message */}
      <motion.div 
        className="bg-[#f0fdf4] text-[#1a1f2e] p-6 rounded-2xl rounded-tr-none shadow-2xl max-w-md relative mb-16 z-10"
        initial={{ opacity: 0, scale: 0.8, y: -50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="text-sm text-[#16a34a] font-bold mb-1 text-right">Little Red</div>
        <div className="text-2xl font-bold">I'm here! Safe and sound. 🏡</div>
      </motion.div>

      {/* Hero Shield / Logo */}
      <motion.div 
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.div 
          className="w-32 h-40 bg-[#22c55e] rounded-b-full shadow-[0_0_80px_rgba(34,197,94,0.6)] flex flex-col items-center justify-center border-4 border-[#16a34a] relative overflow-hidden"
        >
          <motion.div 
            className="absolute inset-0 bg-white/20"
            animate={{ top: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
          />
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="M9 12l2 2 4-4"></path>
          </svg>
        </motion.div>

        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          <div className="text-4xl font-black tracking-widest mb-4 uppercase text-[#22c55e]" style={{ fontFamily: 'var(--font-display)' }}>
            eblockwatch
          </div>
          <div className="text-2xl text-white/80 font-light tracking-wide">
            Nobody travels alone.
          </div>
        </motion.div>

      </motion.div>

    </motion.div>
  );
}
