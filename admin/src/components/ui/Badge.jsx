export default function Badge({ children, className = '' }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
