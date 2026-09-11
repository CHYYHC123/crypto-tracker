import { X } from 'lucide-react';

interface DialogHeaderProps {
  title: string;
  onClose: () => void;
}

export default function DialogHeader({ title, onClose }: DialogHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
      <h3 className="text-white font-semibold text-base">{title}</h3>
      <button onClick={onClose} className="text-gray-400 hover:text-white transition cursor-pointer">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
