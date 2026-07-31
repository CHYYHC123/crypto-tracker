import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      toast.success('Copied!', { duration: 1500 });
    } catch {
      toast.error('Copy failed', { duration: 1500 });
      setCopiedText(null);
    }
  }, []);

  return { copy, copiedText };
}
