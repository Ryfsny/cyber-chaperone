import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden" {...sceneTransitions.wipe}>
      
      {/* Drifting Trees */}
      <motion.div 
        className="absolute inset-0 flex items-end opacity-20"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      >
        {[...Array(10)].map((_, i) => (
          <div key={i} className="w-20 h-80 bg-[#16a34a] rounded-t-full mx-10 shrink-0" />
        ))}
      </motion.div>

      <div className="relative z-10 flex w-full max-w-6xl items-center justify-between px-20">
        
        {/* Operator Phone */}
        <motion.div
          className="relative w-[300px] h-[600px] bg-black rounded-[3rem] border-8 border-gray-800 shadow-2xl overflow-hidden"
          initial={{ y: 100, rotate: -5 }}
          animate={{ y: 0, rotate: -5 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="absolute top-0 w-full h-8 flex justify-center pt-2">
            <div className="w-20 h-4 bg-black rounded-full z-20"></div>
          </div>
          
          <div className="w-full h-full bg-[#1a1f2e] p-6 pt-16 flex flex-col items-center">
            <div className="text-sm font-bold text-gray-400 mb-6 tracking-widest">SITUATION ROOM</div>
            
            <motion.div 
              className="w-32 h-32 rounded-full border-8 border-[#22c55e] flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]"
              animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 30px rgba(34,197,94,0.4)", "0 0 60px rgba(34,197,94,0.8)", "0 0 30px rgba(34,197,94,0.4)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="text-3xl font-black text-[#22c55e]">OK</div>
            </motion.div>

            <div className="mt-8 w-full space-y-4">
              <div className="h-12 bg-white/5 rounded-lg w-full flex items-center px-4">
                <div className="w-3 h-3 rounded-full bg-[#22c55e] mr-3 animate-pulse"></div>
                <div className="text-sm">Tracking active</div>
              </div>
              <div className="h-12 bg-white/5 rounded-lg w-full flex items-center px-4">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
                <div className="text-sm">Location updated</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Text */}
        <div className="flex-1 pl-20">
          <motion.h2 
            className="text-5xl font-black mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)' }}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Cyber Chaperone is <br/><span className="text-[#22c55e]">watching every step.</span>
          </motion.h2>
          <motion.p 
            className="text-2xl text-gray-400"
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          >
            A dedicated operator monitors the journey in real-time.
          </motion.p>
        </div>

      </div>
    </motion.div>
  );
}
