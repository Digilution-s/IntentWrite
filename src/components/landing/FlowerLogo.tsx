import React from 'react';

interface FlowerLogoProps {
  className?: string;
  size?: number;
}

export const FlowerLogo: React.FC<FlowerLogoProps> = ({ className = 'w-7 h-7 sm:w-8 sm:h-8' }) => {
  // 8 circles at radius 10 around center (16,16) plus center circle, all r=3.5, viewBox 0 0 32 32
  const center = 16;
  const radius = 10;
  const petalRadius = 3.5;

  const petals = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 2 * Math.PI) / 8;
    const cx = Number((center + radius * Math.cos(angle)).toFixed(2));
    const cy = Number((center + radius * Math.sin(angle)).toFixed(2));
    return <circle key={i} cx={cx} cy={cy} r={petalRadius} fill="#ef4d23" />;
  });

  return (
    <svg
      viewBox="0 0 32 32"
      className={`${className} shrink-0`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="IntentWrite Logo"
    >
      {petals}
      <circle cx={center} cy={center} r={petalRadius} fill="#ef4d23" />
    </svg>
  );
};
