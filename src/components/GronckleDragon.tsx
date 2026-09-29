import { useState } from 'react';
import { motion } from 'framer-motion';

interface GronckleDragonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  showEmber?: boolean;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-36 h-36',
};

export function GronckleDragon({ className = '', size = 'md', animate = true, showEmber = false }: GronckleDragonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${sizeMap[size]} ${className}`}
      initial={{ rotate: -5, scale: 0.9 }}
      animate={{ rotate: 0, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full ${animate ? 'gronckle-breathe' : ''}`}
        style={{ filter: isHovered ? 'drop-shadow(0 0 12px rgba(255, 107, 43, 0.3))' : 'none', transition: 'filter 0.4s ease' }}
      >
        {/* Dragon body - curled up sleeping pose */}
        <path
          d="M60 20 C45 12 28 18 22 32 C16 46 20 58 28 66 C32 70 38 74 46 76 C52 78 58 78 64 76 L78 74 C86 72 92 66 96 58 C100 50 100 40 96 32 C92 24 82 18 72 18 C68 18 64 19 60 20 Z"
          fill="currentColor"
          opacity="0.95"
        />
        {/* Belly scales */}
        <path
          d="M38 40 Q42 44 46 40 M42 48 Q46 52 50 48 M46 56 Q50 60 54 56"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          opacity="0.3"
          strokeLinecap="round"
        />
        {/* Head */}
        <ellipse cx="38" cy="30" rx="16" ry="14" fill="currentColor" />
        {/* Snout */}
        <ellipse cx="28" cy="32" rx="8" ry="6" fill="currentColor" />
        {/* Nostril */}
        <circle cx="24" cy="30" r="1" fill="black" opacity="0.3" />
        {/* Fang */}
        <path d="M32 36 L34 40 L30 36" fill="white" opacity="0.8" />
        {/* Eye - closed (default) / open (on hover) */}
        <g className="gronckle-eye" style={{ transition: 'all 0.3s ease' }}>
          {isHovered ? (
            <>
              <circle cx="36" cy="26" r="3.5" fill="#FF6B2B" />
              <circle cx="37" cy="25.5" r="1.5" fill="black" />
              <circle cx="37.5" cy="25" r="0.5" fill="white" />
            </>
          ) : (
            <path
              d="M32 26 Q36 28 40 26"
              stroke="currentColor"
              strokeWidth="1.8"
              fill="none"
              opacity="0.4"
              strokeLinecap="round"
            />
          )}
        </g>
        {/* Horns */}
        <path d="M34 18 L30 10 L36 16" fill="currentColor" opacity="0.7" />
        <path d="M42 18 L44 10 L40 16" fill="currentColor" opacity="0.7" />
        {/* Back spikes */}
        <path d="M52 18 L54 12 L56 18" fill="currentColor" opacity="0.5" />
        <path d="M60 18 L62 13 L64 19" fill="currentColor" opacity="0.5" />
        <path d="M68 20 L70 15 L72 21" fill="currentColor" opacity="0.5" />
        {/* Wing (folded) */}
        <path
          d="M62 28 C68 22 78 22 82 28 C78 26 72 26 68 30 C74 28 80 30 82 34 C78 32 72 32 68 34 L62 36 Z"
          fill="currentColor"
          opacity="0.6"
        />
        {/* Tail curving around */}
        <path
          d="M90 58 C96 62 98 68 94 74 C90 80 82 82 76 80 C70 78 64 76 58 76 L46 76"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Tail spikes */}
        <path d="M94 72 L98 68 L96 74" fill="currentColor" opacity="0.5" />
        <path d="M88 78 L92 74 L90 80" fill="currentColor" opacity="0.5" />
        <path d="M82 80 L86 76 L84 82" fill="currentColor" opacity="0.5" />
        {/* Front paw */}
        <ellipse cx="34" cy="68" rx="6" ry="4" fill="currentColor" opacity="0.8" />
        {/* Hind paw */}
        <ellipse cx="56" cy="72" rx="6" ry="4" fill="currentColor" opacity="0.8" />
        {/* Ember particle (conditional) */}
        {showEmber && (
          <g className="gronckle-ember">
            <circle cx="22" cy="28" r="1.5" fill="#FF6B2B" opacity="0.8">
              <animate attributeName="cy" values="28;22;16" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.4;0" dur="2s" repeatCount="indefinite" />
              <animate attributeName="r" values="1.5;1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="20" cy="26" r="1" fill="#FF6B2B" opacity="0.6">
              <animate attributeName="cy" values="26;20;14" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.3;0" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="r" values="1;0.7;0.2" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </motion.div>
  );
}
