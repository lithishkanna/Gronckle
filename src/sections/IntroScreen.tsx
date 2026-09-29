import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';

interface IntroScreenProps {
  onComplete: () => void;
}

// Curated high-tech Unsplash images (w=1920 for fast load at full HD)
const SPLASH_IMAGES = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80&auto=format',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1920&q=80&auto=format',
  'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1920&q=80&auto=format',
  'https://images.unsplash.com/photo-1555617981-dac3d01d57d0?w=1920&q=80&auto=format',
];

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [phase, setPhase] = useState<'fade-in' | 'center' | 'sliding' | 'done'>('fade-in');
  const [activeImage, setActiveImage] = useState(0);

  // Preload all splash images
  useEffect(() => {
    SPLASH_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const finish = useCallback(() => {
    setPhase('done');
    document.body.style.overflow = '';
    sessionStorage.setItem('gronckle-intro-played', 'true');
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Skip intro if already played this session
    const hasPlayed = sessionStorage.getItem('gronckle-intro-played');
    if (hasPlayed === 'true') {
      finish();
      return;
    }

    // Lock scroll during intro
    document.body.style.overflow = 'hidden';

    // Phase timeline
    // 0–1s: fade-in phase (initial state)
    const centerTimer = setTimeout(() => setPhase('center'), 1000);

    // Rotate background images every 1.2s
    const imageInterval = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % SPLASH_IMAGES.length);
    }, 1200);

    // 3s: start sliding to navbar
    const slideTimer = setTimeout(() => {
      setPhase('sliding');
    }, 3000);

    // 4s: done
    const doneTimer = setTimeout(() => {
      finish();
    }, 4000);

    return () => {
      clearTimeout(centerTimer);
      clearTimeout(slideTimer);
      clearTimeout(doneTimer);
      clearInterval(imageInterval);
      document.body.style.overflow = '';
    };
  }, [finish]);

  if (phase === 'done') return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999]"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === 'sliding' ? 0 : 1 }}
      transition={{
        opacity: {
          duration: phase === 'fade-in' ? 1 : 0.8,
          delay: phase === 'sliding' ? 0.3 : 0,
        },
      }}
      style={{ pointerEvents: phase === 'sliding' ? 'none' : 'auto' }}
    >
      {/* ── Ken Burns Background Slideshow ── */}
      <div className="absolute inset-0 overflow-hidden">
        {SPLASH_IMAGES.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: activeImage === i ? 1 : 0 }}
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover ken-burns-zoom"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* ── Dark Overlay ── */}
      <div className="absolute inset-0 bg-black/60" />

      {/* ── Centered Logo + Brand ── */}
      <div className="relative flex flex-col items-center justify-center w-full h-full gap-6">
        {/* Dragon Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{
            opacity: phase === 'sliding' ? 0 : 1,
            scale: phase === 'sliding' ? 0.3 : 1,
            y: phase === 'sliding' ? -200 : 0,
          }}
          transition={{
            opacity: { duration: 1 },
            scale: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
            y: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
          }}
          className="relative"
        >
          <Logo className="w-28 h-28 md:w-36 md:h-36 text-white drop-shadow-[0_0_40px_rgba(255,107,43,0.2)]" />
          {/* Glow ring behind logo */}
          <div
            className="absolute inset-0 -m-4 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,107,43,0.1) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />
        </motion.div>

        {/* Brand Name */}
        <motion.h1
          layoutId="logo"
          className="font-bold text-white uppercase select-none tracking-[0.2em]"
          style={{
            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
            textShadow: '0 0 30px rgba(255,255,255,0.15), 0 0 60px rgba(255,255,255,0.06)',
          }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: 1,
            scale: 1,
            fontSize: phase === 'sliding' ? '1.125rem' : '4rem',
          }}
          transition={{
            opacity: { duration: 1 },
            scale: { duration: 1 },
            fontSize: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
            layout: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
          }}
        >
          GRONCKLE
        </motion.h1>
      </div>

      {/* ── Slogan — visible during center phase only ── */}
      {(phase === 'fade-in' || phase === 'center') && (
        <motion.p
          className="absolute bottom-[32%] left-0 right-0 text-center text-sm md:text-base text-white/40 tracking-[0.35em] uppercase select-none"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          Hoard the Best. Build the Rest.
        </motion.p>
      )}
    </motion.div>
  );
}
