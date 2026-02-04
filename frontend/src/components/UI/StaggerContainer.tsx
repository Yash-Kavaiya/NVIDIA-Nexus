import { motion } from 'framer-motion';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  component?: any;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
};

export function StaggerContainer({ children, className = '', component = 'div' }: StaggerContainerProps) {
  const Component = motion[component as keyof typeof motion] || motion.div;

  return (
    <Component
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({ children, className = '', component = 'div' }: { children: React.ReactNode; className?: string; component?: any }) {
  const Component = motion[component as keyof typeof motion] || motion.div;

  return (
    <Component variants={itemVariants} className={className}>
      {children}
    </Component>
  );
}
