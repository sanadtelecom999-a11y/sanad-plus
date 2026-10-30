import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 text-muted hover:text-primary transition-colors rounded-lg hover:bg-white/10" title="نسخ">
      {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
    </button>
  );
}
