import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import scene4Bg from '@/assets/scene4-danger.png';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const statusColor = phase >= 2 ? '#ef4444' : phase >= 1 ? '#f59e0b' : '#22c55e';
  const statusLabel = phase >= 2 ? 'RED' : phase >= 1 ? 'AMBER' : 'GREEN';
  const statusGlow = phase >= 2
    ? '0 0 60px rgba(239,68,68,0.7)'
    : phase >= 1
    ? '0 0 40px rgba(245,158,11,0.6)'
    : '0 0 30px rgba(34,197,94,0.4)';

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Background */}
      <motion.img
        src={scene4Bg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Darkening overlay as danger escalates */}
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundColor: phase >= 2
            ? 'rgba(69,10,10,0.65)'
            : phase >= 1
            ? 'rgba(69,26,3,0.55)'
            : 'rgba(26,31,46,0.45)',
        }}
        transition={{ duration: 0.7 }}
      />

      {/* Screen flash on RED */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            className="absolute inset-0 bg-red-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0, 0.3, 0] }}
            transition={{ duration: 0.8, times: [0, 0.2, 0.4, 0.7, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Centre: Status indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-8">

          <motion.div
            className="w-48 h-48 rounded-full border-8 flex items-center justify-center"
            animate={{
              borderColor: statusColor,
              boxShadow: statusGlow,
              scale: phase >= 2 ? [1, 1.08, 1] : 1,
            }}
            transition={{
              borderColor: { duration: 0.5 },
              boxShadow: { duration: 0.5 },
              scale: { repeat: phase >= 2 ? Infinity : 0, duration: 0.6 },
            }}
          >
            <motion.span
              className="text-5xl font-black"
              animate={{ color: statusColor }}
              transition={{ duration: 0.5 }}
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              {statusLabel}
            </motion.span>
          </motion.div>

          <motion.p
            className="text-white text-2xl font-bold text-center drop-shadow-lg"
            animate={{ opacity: 1 }}
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
          >
            {phase >= 2 ? 'DANGER. Alerting ICE contact.' : phase >= 1 ? 'No reply. Escalating…' : 'Waiting for check-in…'}
          </motion.p>
        </div>
      </div>

      {/* Alert card — Granny is pinged */}
      <motion.div
        className="absolute bottom-10 right-10 max-w-xs"
        initial={{ x: 120, opacity: 0 }}
        animate={phase >= 3 ? { x: 0, opacity: 1 } : { x: 120, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      >
        <div className="bg-[#1e293b]/95 border border-red-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-sm relative">
          <motion.div
            className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          >
            URGENT
          </motion.div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-400 text-xl">⚠️</span>
            <span className="text-white font-bold text-sm">Alert sent to: Granny</span>
          </div>

          {/* Mini map */}
          <div className="bg-black/60 rounded-xl h-28 mb-3 flex items-center justify-center relative overflow-hidden border border-gray-700">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, #475569 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
            />
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#ef4444" stroke="white" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" fill="white" />
              </svg>
            </motion.div>
          </div>

          <p className="text-xs text-gray-400">Last known location shared via WhatsApp</p>
        </div>
      </motion.div>

      {/* Caption */}
      <motion.div
        className="absolute top-10 left-0 right-0 flex justify-center"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div
          className="text-white text-3xl font-black text-center drop-shadow-2xl px-8"
          style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}
        >
          Someone didn't reply…<br />
          <span className="text-red-400">Granny is alerted instantly.</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
