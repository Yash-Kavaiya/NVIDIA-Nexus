import { motion } from 'framer-motion';

interface GlowEffectProps {
  children: React.ReactNode;
  color?: string;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export default function GlowEffect({
  children,
  color = '#76B900',
  intensity = 'medium',
  className = '',
}: GlowEffectProps) {
  const intensityMap = {
    low: '0 0 10px',
    medium: '0 0 20px',
    high: '0 0 40px',
  };

  return (
    <motion.div
      className={className}
      animate={{
        boxShadow: [
          `${intensityMap[intensity]} ${color}40`,
          `${intensityMap[intensity]} ${color}80`,
          `${intensityMap[intensity]} ${color}40`,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
}
