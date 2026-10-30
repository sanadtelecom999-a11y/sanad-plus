import Spinner from './Spinner';

export default function Button({ children, variant = 'primary', loading = false, disabled = false, className = '', ...props }) {
  const variants = {
    primary: 'bg-primary hover:bg-accent text-bg shadow-lg shadow-primary/20',
    success: 'bg-success hover:bg-success/80 text-bg shadow-lg shadow-success/20',
    danger: 'bg-danger hover:bg-danger/80 text-bg shadow-lg shadow-danger/20',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
    ghost: 'text-muted hover:text-white hover:bg-white/5'
  };
  return (
    <button className={`flex items-center justify-center gap-2 font-bold rounded-xl px-4 py-2.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <Spinner size={18} />} {children}
    </button>
  );
}
