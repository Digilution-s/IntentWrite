import React from 'react';

interface GaugeProps {
  value: number;
  color?: string;
  showLabels?: boolean;
  min?: number | string;
  max?: number | string;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  color = '#ef4d23',
  showLabels = false,
  min = 0,
  max = 30,
}) => {
  const totalTicks = 40;
  const activeCount = Math.round((Math.max(0, Math.min(100, value)) / 100) * totalTicks);
  const cx = 100;
  const cy = 100;
  const rOuter = 80;
  const rInner = 70;

  const ticks = Array.from({ length: totalTicks }, (_, i) => {
    // 180° arc: start at angle π (left), sweep to 2π (right)
    const angle = Math.PI + (i / (totalTicks - 1)) * Math.PI;
    const x1 = cx + rInner * Math.cos(angle);
    const y1 = cy + rInner * Math.sin(angle);
    const x2 = cx + rOuter * Math.cos(angle);
    const y2 = cy + rOuter * Math.sin(angle);
    const isActive = i < activeCount;

    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isActive ? color : '#d4d4d8'}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    );
  });

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox="0 0 200 120"
        className="w-full max-w-[260px] overflow-visible"
        aria-hidden="true"
      >
        {ticks}
        <text
          x={100}
          y={105}
          textAnchor="middle"
          fill="#171717"
          className="text-[22px] font-semibold select-none"
        >
          {value}%
        </text>
      </svg>
      {showLabels && (
        <div className="w-full max-w-[220px] flex items-center justify-between text-[11px] text-neutral-500 mt-1 px-1">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
};
