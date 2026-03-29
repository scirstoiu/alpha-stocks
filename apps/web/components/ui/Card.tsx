export default function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const hasCustomBg = className.includes('bg-');
  const hasCustomBorder = className.includes('border-');
  const base = `${hasCustomBg ? '' : 'bg-white'} rounded-lg ${hasCustomBorder ? '' : 'border border-gray-200'} p-4 shadow-sm`;
  return (
    <div className={`${base} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
