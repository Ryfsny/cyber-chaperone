import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import scene3Bg from '@/assets/scene3-checkin.png';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
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
      {/* Background */}
      <motion.img
        src={scene3Bg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 5, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-[#1a1f2e]/60" />

      {/* Animated route path */}
      <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 1280 720" preserveAspectRatio="none">
        <motion.path
          d="M 100,620 Q 350,500 500,420 T 800,280 Q 950,200 1180,100"
          fill="none"
          stroke="#22c55e"
          strokeWidth="6"
          strokeDasharray="18 14"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3.5, ease: 'easeInOut' }}
        />
        <motion.circle
          r="10"
          fill="#22c55e"
          style={{ filter: 'drop-shadow(0 0 8px #22c55e)' }}
          initial={{ offsetDistance: '0%' } as React.CSSProperties}
          animate={{ offsetDistance: '100%' } as React.CSSProperties}
          transition={{ duration: 3.5, ease: 'easeInOut' }}
        />
      </svg>

      {/* Chat bubbles */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8">

        {/* System ping */}
        <motion.div
          className="self-start max-w-md"
          initial={{ x: -60, opacity: 0, scale: 0.85 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        >
          <div className="bg-[#1e293b]/95 border border-[#22c55e]/30 rounded-2xl rounded-tl-sm px-6 py-4 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-[#22c55e] rounded-full flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <span className="text-xs font-bold text-[#22c55e]">Cyber Chaperone</span>
            </div>
            <p className="text-white text-lg font-medium">Are you okay? Still on your way?</p>
            <p className="text-xs text-gray-500 mt-1">4:05 PM</p>
          </div>
        </motion.div>

        {/* Member reply */}
        <motion.div
          className="self-end max-w-md"
          initial={{ x: 60, opacity: 0, scale: 0.85 }}
          animate={phase >= 1 ? { x: 0, opacity: 1, scale: 1 } : { x: 60, opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        >
          <div className="bg-[#f0fdf4] rounded-2xl rounded-tr-sm px-6 py-4 shadow-2xl">
            <p className="text-xs font-bold text-[#16a34a] mb-1 text-right">Little Red 🧒</p>
            <p className="text-[#1a1f2e] text-lg font-semibold">Yes! Almost there. 🌲</p>
            <p className="text-xs text-gray-400 text-right mt-1">4:06 PM ✓✓</p>
          </div>
        </motion.div>

        {/* Status badge */}
        <motion.div
          className="mt-2"
          initial={{ y: 30, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <motion.div
            className="bg-[#22c55e]/15 border border-[#22c55e]/50 text-[#22c55e] px-8 py-3 rounded-full font-black tracking-widest uppercase flex items-center gap-3 text-lg backdrop-blur-sm"
            animate={{ boxShadow: ['0 0 0px rgba(34,197,94,0)', '0 0 20px rgba(34,197,94,0.4)', '0 0 0px rgba(34,197,94,0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-3 h-3 rounded-full bg-[#22c55e]"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            Status: Green
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
