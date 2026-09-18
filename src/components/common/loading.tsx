import React from 'react';
import { Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingProps {
  size?: number;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ size = 24, className }) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader className="animate-spin text-muted" size={size} />
    </div>
  );
};

export default Loading;
