export default function Input({ label, error, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1.5 text-muted">{label}</label>}
      <input className={`input-ios ${className}`} {...props} />
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
