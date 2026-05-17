import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Amber
      setTimeout(() => setPhase(2), 2000), // Red
      setTimeout(() => setPhase(3), 3000), // Map pin
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden" {...sceneTransitions.zoomThrough}>
      
      {/* Background that turns red */}
      <motion.div 
        className="absolute inset-0"
        animate={{ 
          backgroundColor: phase >= 2 ? '#450a0a' : phase >= 1 ? '#451a03' : '#1a1f2e' 
        }}
        transition={{ duration: 0.5 }}
      />

      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between px-10">
        
        {/* Operator View */}
        <div className="flex flex-col items-center w-1/2">
          <motion.div 
            className="w-48 h-48 rounded-full flex items-center justify-center border-8 shadow-2xl mb-8"
            animate={{ 
              borderColor: phase >= 2 ? '#ef4444' : phase >= 1 ? '#f59e0b' : '#22c55e',
              boxShadow: phase >= 2 ? '0 0 80px rgba(239,68,68,0.6)' : phase >= 1 ? '0 0 50px rgba(245,158,11,0.6)' : '0 0 30px rgba(34,197,94,0.4)',
              scale: phase >= 2 ? [1, 1.1, 1] : 1
            }}
            transition={{ scale: { repeat: phase >= 2 ? Infinity : 0, duration: 0.5 } }}
          >
            <motion.div 
              className="text-5xl font-black"
              animate={{ color: phase >= 2 ? '#ef4444' : phase >= 1 ? '#f59e0b' : '#22c55e' }}
            >
              {phase >= 2 ? 'RED' : phase >= 1 ? 'AMBER' : 'OK'}
            </motion.div>
          </motion.div>
          
          <div className="text-2xl font-bold font-display text-center">
            {phase === 0 && "Checking in..."}
            {phase === 1 && "No reply. Escalating..."}
            {phase >= 2 && "DANGER. Alerting ICE."}
          </div>
        </div>

        {/* Map Alert */}
        <motion.div 
          className="w-1/2 flex flex-col items-center"
          initial={{ opacity: 0, x: 100 }}
          animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 100 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="bg-[#1e293b] p-8 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-sm relative">
            <div className="absolute -top-4 -right-4 bg-[#ef4444] text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce">
              URGENT
            </div>
            <div className="text-xl font-bold mb-4 flex items-center">
              <svg className="w-6 h-6 mr-2 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Alert to Granny
            </div>
            <div className="bg-black/50 h-40 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center border border-gray-800">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #475569 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              <motion.div 
                className="relative"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#ef4444" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3" fill="white"></circle>
                </svg>
              </motion.div>
            </div>
            <div className="text-sm text-gray-400">
              Last known location pin sent.
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
