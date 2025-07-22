interface PriorityDotProps {
  priority: "low" | "medium" | "high";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

const PRIORITY_COLORS = {
  low: "#22c55e",    // Green
  medium: "#eab308", // Yellow
  high: "#ef4444",   // Red
};

const PRIORITY_SIZES = {
  sm: "w-2 h-2",
  md: "w-3 h-3", 
  lg: "w-4 h-4",
};

export default function PriorityDot({ priority, size = "md", onClick, className = "" }: PriorityDotProps) {
  return (
    <div
      className={`${PRIORITY_SIZES[size]} rounded-full ${onClick ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${className}`}
      style={{ backgroundColor: PRIORITY_COLORS[priority] }}
      title={`Priority: ${priority}${onClick ? ' (click to change)' : ''}`}
      onClick={onClick}
    />
  );
}