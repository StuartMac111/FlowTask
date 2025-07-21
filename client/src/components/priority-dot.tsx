interface PriorityDotProps {
  priority: "low" | "medium" | "high";
  size?: "sm" | "md" | "lg";
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

export default function PriorityDot({ priority, size = "md" }: PriorityDotProps) {
  return (
    <div
      className={`${PRIORITY_SIZES[size]} rounded-full`}
      style={{ backgroundColor: PRIORITY_COLORS[priority] }}
      title={`Priority: ${priority}`}
    />
  );
}