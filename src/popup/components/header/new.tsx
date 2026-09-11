import React from 'react';

interface NewFlagProps {
  text?: string;
  className?: string;
}

const NewFlag: React.FC<NewFlagProps> = ({ text = 'NEW', className = '' }) => {
  return <span className={`inline-flex items-center justify-center px-1 py-0.5 text-[8px] font-extrabold leading-none text-white tracking-wider rounded bg-linear-to-r from-pink-500 to-purple-600 shadow-[0_0_8px_rgba(236,72,153,0.5)] select-none pointer-events-none ${className}`}>{text}</span>;
};

export default NewFlag;
