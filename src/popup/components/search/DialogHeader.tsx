import { X } from 'lucide-react';

interface DialogHeaderProps {
  title: string;
  onClose: () => void;
}

export default function DialogHeader({ title, onClose }: DialogHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
      <h3 className="text-foreground-bold font-semibold text-base">{title}</h3>
      <button onClick={onClose} className="text-muted hover:text-foreground-bold transition cursor-pointer">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
