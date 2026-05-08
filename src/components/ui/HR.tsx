interface HRProps {
  className?: string;
}

export function HR({ className = "" }: HRProps) {
  return <div className={`h-px bg-line ${className}`} aria-hidden="true" />;
}
