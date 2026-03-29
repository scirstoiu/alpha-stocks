export default function Card({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
