import React from 'react';

interface NewFlagProps {
  text?: string;
  className?: string;
}

const NewFlag: React.FC<NewFlagProps> = ({ text = 'NEW', className = '' }) => {
  return <span className={`inline-flex items-center justify-center px-1 py-0.5 text-[8px] font-extrabold leading-none text-primary-foreground tracking-wider rounded bg-primary shadow-[0_0_8px_color-mix(in_srgb,var(--app-primary)_50%,transparent)] select-none pointer-events-none ${className}`}>{text}</span>;
};

export default NewFlag;
