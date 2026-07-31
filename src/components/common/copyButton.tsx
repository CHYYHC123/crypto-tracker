import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied!', { duration: 1500 });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed', { duration: 1500 });
    }
  };

  return (
    <button onClick={handleCopy} className="shrink-0 text-white/50 hover:text-white cursor-pointer">
      {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
    </button>
  );
}

export default CopyButton;
