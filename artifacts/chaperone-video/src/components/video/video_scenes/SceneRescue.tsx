import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import rescueBg from '@/assets/scene-rescue.png';

const RESPONDERS = [
  { icon: '🛻', name: 'Johan', area: 'Midrand', delay: 0.2 },
  { icon: '🏍️', name: 'Sipho', area: 'Centurion', delay: 0.6 },
  { icon: '🚗', name: 'Anita', area: 'Boksburg', delay: 1.0 },
];

export function SceneRescue() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1800),
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
      transition={{ duration: 0.7 }}
    >
      <motion.img
        src={rescueBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 5, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1f2e]/70 via-[#1a1f2e]/25 to-[#1a1f2e]/80" />

      {/* Top headline */}
      <motion.div
        className="absolute top-10 left-0 right-0 flex flex-col items-center"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 18 }}
      >
        <h2
          className="text-white text-5xl font-black text-center leading-tight"
          style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}
        >
          The community<br />
          <span className="text-[#22c55e]">moves to help.</span>
        </h2>
      </motion.div>

      {/* Responder cards */}
      <motion.div
        className="absolute bottom-16 left-0 right-0 flex justify-center gap-5 px-10"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {RESPONDERS.map((r, i) => (
          <motion.div
            key={i}
            className="bg-[#1a1f2e]/90 border border-[#22c55e]/30 rounded-2xl px-5 py-4 flex flex-col items-center gap-2 backdrop-blur-sm shadow-2xl"
            initial={{ y: 60, opacity: 0 }}
            animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22, delay: r.delay }}
          >
            <span className="text-4xl">{r.icon}</span>
            <span className="text-white font-black text-lg">{r.name}</span>
            <span className="text-[#22c55e] text-xs font-bold tracking-wide">{r.area}</span>
            <motion.div
              className="flex items-center gap-1.5 bg-[#22c55e]/15 border border-[#22c55e]/30 px-3 py-1 rounded-full"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: r.delay }}
            >
              <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-[#22c55e] text-xs font-bold">En route</span>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* WhatsApp alert to members */}
      <motion.div
        className="absolute right-10 top-1/2 -translate-y-1/2 max-w-xs"
        initial={{ x: 80, opacity: 0 }}
        animate={phase >= 2 ? { x: 0, opacity: 1 } : { x: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="bg-white rounded-2xl rounded-tr-sm shadow-2xl px-5 py-4">
          <p className="text-xs font-bold text-[#22c55e] mb-2">Community Alert 🔔</p>
          <p className="text-[#1a1f2e] text-sm font-semibold leading-relaxed">
            Member needs assistance on N1 near Bela-Bela. Who can help?
          </p>
          <p className="text-xs text-gray-400 mt-2">📍 Location shared</p>
        </div>
      </motion.div>

      {/* Caption */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl text-center px-8"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p
          className="text-white/90 text-xl font-light"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
        >
          Nearby eblockwatch members are alerted and respond — no wolf stands a chance.
        </p>
      </motion.div>
    </motion.div>
  );
}
