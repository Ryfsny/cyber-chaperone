import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import communityBg from '@/assets/scene-community.png';

const MEMBERS = [
  { top: '22%', left: '18%', delay: 0.3, label: 'Sandton' },
  { top: '45%', left: '38%', delay: 0.6, label: 'Soweto' },
  { top: '30%', left: '62%', delay: 0.9, label: 'Pretoria' },
  { top: '65%', left: '55%', delay: 1.1, label: 'Germiston' },
  { top: '50%', left: '80%', delay: 1.4, label: 'Benoni' },
  { top: '70%', left: '25%', delay: 1.6, label: 'Krugersdorp' },
];

export function SceneCommunity() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 3500),
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
      <motion.img
        src={communityBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1f2e]/75 via-[#1a1f2e]/30 to-[#1a1f2e]/75" />

      {/* Pulsing member dots */}
      {MEMBERS.map((m, i) => (
        <motion.div
          key={i}
          className="absolute flex flex-col items-center gap-1"
          style={{ top: m.top, left: m.left }}
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: m.delay }}
        >
          <motion.div
            className="w-5 h-5 rounded-full bg-[#22c55e] border-2 border-white/80"
            animate={{ boxShadow: ['0 0 0px #22c55e', '0 0 16px #22c55e', '0 0 0px #22c55e'] }}
            transition={{ duration: 2, repeat: Infinity, delay: m.delay }}
          />
          <span className="text-[10px] text-white/70 font-bold tracking-wide bg-[#1a1f2e]/60 px-1.5 py-0.5 rounded">
            {m.label}
          </span>
        </motion.div>
      ))}

      {/* Top headline */}
      <motion.div
        className="absolute top-10 left-0 right-0 flex flex-col items-center gap-3"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 18 }}
      >
        <h2
          className="text-white text-5xl font-black text-center drop-shadow-2xl leading-tight"
          style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}
        >
          Eyes and ears<br />
          <span className="text-[#22c55e]">everywhere.</span>
        </h2>
      </motion.div>

      {/* Bottom caption */}
      <motion.div
        className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-3 px-8"
        initial={{ y: 40, opacity: 0 }}
        animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 130, damping: 20 }}
      >
        <p
          className="text-white/90 text-2xl text-center font-light leading-relaxed"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
        >
          As Little Red travels, she passes through areas covered by<br />
          <strong className="text-[#22c55e] font-bold">eblockwatch community members</strong> — on the ground, in their neighbourhoods.
        </p>
        <motion.div
          className="bg-[#22c55e]/15 border border-[#22c55e]/40 text-[#22c55e] px-6 py-2 rounded-full text-sm font-black tracking-widest uppercase backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {MEMBERS.length} members active in this area
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
