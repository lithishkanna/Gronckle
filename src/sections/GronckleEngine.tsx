import { useEffect, useState } from 'react';
import { getTools, subscribeToToolLikes, subscribeToNewTools, subscribeToHeartbeat } from '@/lib/supabase';
import { motion } from 'framer-motion';

export function GronckleEngine() {
  const [rpm, setRpm] = useState(0);
  const [isTurbo, setIsTurbo] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Initial data load for baseline RPM
    async function loadStats() {
      try {
        const tools = await getTools();
        setRpm(tools.length * 10); // Base RPM scale
      } catch (err) {
        console.error('Failed to load engine stats', err);
      }
    }
    loadStats();

    let turboTimeout: ReturnType<typeof setTimeout>;

    const triggerTurbo = () => {
      setIsTurbo(true);
      clearTimeout(turboTimeout);
      turboTimeout = setTimeout(() => setIsTurbo(false), 3000);
    };

    // Listen to likes (updates)
    const unsubLikes = subscribeToToolLikes(() => {
      triggerTurbo();
    });

    // Listen to new tools (creates)
    const unsubNew = subscribeToNewTools(() => {
      setRpm((prev) => prev + 10);
      triggerTurbo();
    });

    // Listen to the custom Postgres Broadcast trigger
    const unsubHeartbeat = subscribeToHeartbeat(() => {
      setRpm((prev) => prev + 5);
      triggerTurbo();
    });

    const handleSearch = (e: Event) => {
      const customEvent = e as CustomEvent;
      const count = customEvent.detail?.count || 0;
      if (count === 0) {
        setIsError(true);
        setIsTurbo(false);
        clearTimeout(turboTimeout);
        turboTimeout = setTimeout(() => setIsError(false), 2000);
      } else {
        setIsError(false);
        setIsTurbo(true);
        setRpm((prev) => prev + (count * 10));
        clearTimeout(turboTimeout);
        turboTimeout = setTimeout(() => setIsTurbo(false), 3000);
      }
    };
    window.addEventListener('gronckle-search', handleSearch);

    return () => {
      unsubLikes();
      unsubNew();
      unsubHeartbeat();
      window.removeEventListener('gronckle-search', handleSearch);
      clearTimeout(turboTimeout);
    };
  }, []);

  return (
    <div className="flex flex-col items-end border border-[#2a2a2a] bg-[#0d0d0d] p-6 h-full min-h-[450px]">
      {/* Title / Status */}
      <div className="w-full flex justify-between items-center mb-8 border-b border-[#2a2a2a] pb-2">
        <span className="text-white/30 text-xs tracking-widest uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          sys.engine
        </span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isError ? 'bg-red-500 animate-pulse' : isTurbo ? 'bg-cyan-400 animate-pulse' : 'bg-green-500/50'}`} />
          <span className={`text-[10px] tracking-widest uppercase ${isError ? 'text-red-500' : isTurbo ? 'text-cyan-400' : 'text-green-500/50'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {isError ? 'SYSTEM ERR' : isTurbo ? 'BOOST ACHV' : 'NOMINAL'}
          </span>
        </div>
      </div>

      {/* Engine Graphic */}
      <div className="relative flex-1 w-full flex items-center justify-center">
        {/* Outer casing */}
        <div className="absolute w-64 h-64 border border-white/10 rounded-full flex items-center justify-center">
            <div className="w-56 h-56 border border-white/5 rounded-full border-dashed" />
        </div>

        {/* The Impeller (SVG Animation) */}
        <motion.div
          className="relative w-48 h-48 origin-center"
          animate={{ 
            rotate: 360, 
            x: isError ? [-2, 2, -2, 2, 0] : 0,
            filter: isError ? 'hue-rotate(-50deg) saturate(3)' : 'hue-rotate(0deg)'
          }}
          transition={{
            rotate: { repeat: Infinity, ease: "linear", duration: isError ? 0.3 : isTurbo ? 1 : 15 },
            x: { duration: 0.1, repeat: isError ? Infinity : 0 }
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
            {/* Center Hub */}
            <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.5" />
            
            {/* Blades */}
            {[...Array(12)].map((_, i) => (
              <g key={i} transform={`rotate(${i * 30} 50 50)`}>
                {/* Main curved blade */}
                <path
                  d="M 50 38 Q 65 20, 50 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
                {/* Secondary inner contour */}
                <path
                  d="M 50 34 Q 58 20, 50 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              </g>
            ))}
            
            {/* Outer Shroud Line */}
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" />
          </svg>
        </motion.div>
      </div>

      {/* RPM Display */}
      <div className="w-full mt-8 flex flex-col items-end">
        <span className="text-white/30 text-[10px] uppercase tracking-widest mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          TOTAL_THRUST
        </span>
        <div className="flex items-baseline gap-2 text-green-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <span className="text-4xl font-bold">{rpm.toLocaleString()}</span>
          <span className="text-sm text-green-400/50">RPM</span>
        </div>
      </div>
    </div>
  );
}
