import { motion } from 'framer-motion';
import { GronckleDragon } from './GronckleDragon';

interface DragonLoaderProps {
  message?: string;
}

/**
 * "Waking up" loading state — replaces boring spinners with the lazy dragon.
 * Dragon yawns and stretches while loading.
 */
export function DragonLoader({ message = 'Gronckle is waking up...' }: DragonLoaderProps) {
  return (
    <div className="min-h-screen pt-16 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <GronckleDragon size="lg" animate showEmber />
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {/* Ember dots loader */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B]"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          <span
            className="text-white/25 text-xs uppercase tracking-[0.25em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {message}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
