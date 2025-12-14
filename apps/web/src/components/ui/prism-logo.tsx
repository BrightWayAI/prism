interface PrismLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function PrismLogo({ size = "md", className = "" }: PrismLogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl", 
    lg: "text-3xl",
    xl: "text-5xl",
  };

  return (
    <span className={`font-bold tracking-tight ${sizeClasses[size]} ${className}`}>
      <span className="text-foreground">Pris</span>
      <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">m</span>
    </span>
  );
}
