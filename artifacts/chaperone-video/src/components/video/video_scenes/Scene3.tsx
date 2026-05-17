import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden" {...sceneTransitions.splitVertical}>
      
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <svg viewBox="0 0 1000 600" className="w-[120%] h-[120%]">
          <motion.path
            d="M 100,500 Q 300,400 500,500 T 900,100"
            fill="none"
            stroke="#22c55e"
            strokeWidth="10"
            strokeDasharray="20 20"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, ease: "easeInOut" }}
          />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-3xl flex flex-col">
        
        {/* System Message */}
        <motion.div 
          className="self-start bg-[#1e293b] border border-gray-700 text-white p-6 rounded-2xl rounded-tl-none shadow-xl max-w-lg mb-8"
          initial={{ opacity: 0, scale: 0.8, x: -50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center mr-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <div className="text-sm text-gray-400 font-bold">Cyber Chaperone</div>
          </div>
          <div className="text-xl">Are you okay? Still on your way?</div>
        </motion.div>

        {/* Reply */}
        <motion.div 
          className="self-end bg-[#f0fdf4] text-[#1a1f2e] p-6 rounded-2xl rounded-tr-none shadow-xl max-w-lg mb-12"
          initial={{ opacity: 0, scale: 0.8, x: 50 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: 50 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="text-sm text-[#16a34a] font-bold mb-1 text-right">Little Red</div>
          <div className="text-xl">Yes! Almost there. 🌲</div>
        </motion.div>

        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        >
          <div className="bg-[#22c55e]/20 text-[#22c55e] px-8 py-3 rounded-full font-bold tracking-widest uppercase flex items-center border border-[#22c55e]/30">
            <div className="w-3 h-3 rounded-full bg-[#22c55e] mr-3 animate-pulse"></div>
            Status: Green
          </div>
        </motion.div>

      </div>

    </motion.div>
  );
}
