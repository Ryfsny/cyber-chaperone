import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import joinBg from '@/assets/scene-join.png';

const STEPS = [
  { num: '1', icon: '💬', label: 'WhatsApp eblockwatch', sub: 'Say "Hi" to get started' },
  { num: '2', icon: '📝', label: 'Register in 60 seconds', sub: 'Name, number, ICE contact' },
  { num: '3', icon: '✅', label: 'Travel safe — always', sub: 'Cyber Chaperone has you' },
];

export function SceneJoin() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 3000),
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
      <motion.img
        src={joinBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      />
      <div className="absolute inset-0 bg-[#1a1f2e]/65" />

      {/* Top headline */}
      <motion.div
        className="absolute top-10 left-0 right-0 flex flex-col items-center gap-3"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 18 }}
      >
        <h2
          className="text-white text-5xl font-black text-center leading-tight"
          style={{ fontFamily: 'Nunito, sans-serif', textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}
        >
          Join the community.
          <br />
          <span className="text-[#22c55e]">It takes 60 seconds.</span>
        </h2>
      </motion.div>

      {/* Steps */}
      <div className="absolute inset-0 flex items-center justify-center pt-24">
        <div className="flex gap-6 px-10 w-full max-w-4xl">
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-[#1a1f2e]/90 border border-[#22c55e]/30 rounded-2xl px-5 py-6 flex flex-col items-center gap-3 backdrop-blur-sm shadow-2xl text-center"
              initial={{ y: 60, opacity: 0 }}
              animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.15 * i }}
            >
              <div className="w-10 h-10 rounded-full bg-[#22c55e] text-[#1a1f2e] font-black text-lg flex items-center justify-center shadow-lg">
                {s.num}
              </div>
              <span className="text-4xl">{s.icon}</span>
              <p className="text-white font-black text-lg leading-snug">{s.label}</p>
              <p className="text-gray-400 text-sm">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* WhatsApp CTA */}
      <motion.div
        className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4"
        initial={{ y: 40, opacity: 0 }}
        animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
      >
        <motion.div
          className="bg-[#22c55e] text-[#1a1f2e] px-10 py-4 rounded-full font-black text-xl shadow-2xl flex items-center gap-3"
          animate={{ boxShadow: ['0 0 0px #22c55e', '0 0 30px rgba(34,197,94,0.5)', '0 0 0px #22c55e'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span>💬</span>
          <span>WhatsApp: +27 82 561 1065</span>
        </motion.div>

        <motion.div
          className="text-white/70 text-lg font-light tracking-wide"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
        >
          eblockwatch.co.za · Nobody travels alone.
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
