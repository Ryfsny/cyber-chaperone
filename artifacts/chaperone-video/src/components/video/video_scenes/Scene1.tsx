import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden" {...sceneTransitions.clipCircle}>
      
      {/* Trees background */}
      <div className="absolute inset-0 flex items-end justify-around pb-20 opacity-30">
        {[1, 2, 3, 4, 5].map(i => (
          <motion.div key={i} className="w-16 h-64 bg-[#16a34a] rounded-t-full"
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            transition={{ duration: 1, delay: i * 0.1, type: "spring", damping: 15 }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.h1 
          className="text-6xl font-black mb-8" style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Are You Going to Granny's?
        </motion.h1>

        {/* WhatsApp Bubble */}
        <motion.div 
          className="bg-[#f0fdf4] text-[#1a1f2e] p-6 rounded-2xl rounded-tl-none shadow-2xl max-w-md relative mb-12"
          initial={{ opacity: 0, scale: 0.8, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: -50 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="text-sm text-[#16a34a] font-bold mb-1">Little Red</div>
          <div className="text-xl">On my way to Granny. ETA 2 hours. 🐺</div>
        </motion.div>

        {/* Shield */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, scale: 0, rotate: -10 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0, rotate: -10 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          <div className="w-24 h-28 bg-[#22c55e] rounded-b-full shadow-[0_0_40px_rgba(34,197,94,0.5)] flex items-center justify-center border-4 border-[#16a34a]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <motion.div 
            className="mt-6 text-2xl font-bold tracking-wide"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          >
            Cyber Chaperone Activated
          </motion.div>
        </motion.div>
      </div>

    </motion.div>
  );
}
