import React from "react";

interface EmployeeAvatarProps {
  name: string;
  photo?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-teal-500 to-emerald-600",
  "from-red-500 to-rose-600",
];

const SIZE_CLASSES: Record<string, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-24 h-24 text-2xl",
};

// Intrinsic pixel dimensions per size — set as width/height attributes on the
// <img> so the browser reserves space before the image loads (prevents CLS).
const SIZE_PX: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 96,
};

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({
  name,
  photo,
  size = "md",
  className = "",
}) => {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const sizePx = SIZE_PX[size] || SIZE_PX.md;
  const gradient = getGradient(name || "?");
  const initials = getInitials(name || "?");

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        width={sizePx}
        height={sizePx}
        loading="lazy"
        decoding="async"
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
        onError={(e) => {
          // If image fails to load, replace with gradient
          const target = e.currentTarget;
          target.style.display = "none";
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = "flex";
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white shrink-0 select-none ${className}`}
      aria-label={name}
    >
      {initials}
    </div>
  );
};

export default EmployeeAvatar;
