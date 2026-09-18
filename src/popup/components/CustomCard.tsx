import { motion, type HTMLMotionProps } from 'framer-motion';

import { cn } from '@/lib/utils';
interface CustomCardProps extends HTMLMotionProps<'button'> {
  className?: string;
  animate?: boolean;
  isSelected?: boolean;
  children: React.ReactNode;
}
const CustomCard = ({ className, children, animate, isSelected, ...props }: CustomCardProps) => {
  return (
    <motion.button
      className={cn('w-full px-3 py-3 rounded-xl border transition-all cursor-pointer text-left', 'bg-input/50 border-border hover:bg-input hover:border-foreground/20', isSelected ?? 'bg-primary/30 border-primary shadow-lg shadow-primary/20', className)}
      animate={animate ? { opacity: [1, 0.85, 1] } : {}}
      whileHover={{ scale: 1.02, boxShadow: '0 0 12px rgba(255, 255, 255, 0.15)' }}
      whileTap={{ scale: 0.98 }}
      transition={{
        opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
        scale: { type: 'spring', stiffness: 300, damping: 20 },
        boxShadow: { duration: 0.3 }
      }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default CustomCard;
