// Plain outline icons drawn with SVG primitives (no partner logos).
import React from 'react';

type P = {x: number; y: number; s: number; color: string; sw?: number; opacity?: number};

const g = (x: number, y: number, s: number) => `translate(${x} ${y}) scale(${s / 32})`;

export const IconCalendar: React.FC<P> = ({x, y, s, color, sw = 2, opacity = 1}) => (
  <g transform={g(x, y, s)} fill="none" stroke={color} strokeWidth={(sw * 32) / s} opacity={opacity} strokeLinecap="square">
    <rect x={3} y={6} width={26} height={23} />
    <line x1={3} y1={12.5} x2={29} y2={12.5} />
    <line x1={10} y1={2.5} x2={10} y2={8.5} />
    <line x1={22} y1={2.5} x2={22} y2={8.5} />
    <rect x={8} y={17} width={4} height={4} fill={color} stroke="none" />
    <rect x={14} y={17} width={4} height={4} fill={color} stroke="none" opacity={0.5} />
    <rect x={20} y={17} width={4} height={4} fill={color} stroke="none" opacity={0.5} />
    <rect x={8} y={23} width={4} height={3} fill={color} stroke="none" opacity={0.5} />
  </g>
);

export const IconCard: React.FC<P> = ({x, y, s, color, sw = 2, opacity = 1}) => (
  <g transform={g(x, y, s)} fill="none" stroke={color} strokeWidth={(sw * 32) / s} opacity={opacity} strokeLinecap="square">
    <rect x={2.5} y={7} width={27} height={19} />
    <line x1={2.5} y1={12.5} x2={29.5} y2={12.5} />
    <rect x={6} y={18} width={7} height={4} fill={color} stroke="none" opacity={0.7} />
  </g>
);

export const IconBell: React.FC<P> = ({x, y, s, color, sw = 2, opacity = 1}) => (
  <g transform={g(x, y, s)} fill="none" stroke={color} strokeWidth={(sw * 32) / s} opacity={opacity} strokeLinecap="square" strokeLinejoin="miter">
    <path d="M8 23 L8 14 Q8 6 16 6 Q24 6 24 14 L24 23 Z" />
    <line x1={5} y1={23} x2={27} y2={23} />
    <line x1={13} y1={27} x2={19} y2={27} />
    <line x1={16} y1={3} x2={16} y2={6} />
  </g>
);

export const IconChat: React.FC<P> = ({x, y, s, color, sw = 2, opacity = 1}) => (
  <g transform={g(x, y, s)} fill="none" stroke={color} strokeWidth={(sw * 32) / s} opacity={opacity} strokeLinecap="square" strokeLinejoin="miter">
    <path d="M3 5 H29 V21 H13 L7 27 V21 H3 Z" />
    <line x1={8} y1={11} x2={24} y2={11} />
    <line x1={8} y1={15.5} x2={19} y2={15.5} />
  </g>
);

export const IconCode: React.FC<P> = ({x, y, s, color, sw = 2, opacity = 1}) => (
  <g transform={g(x, y, s)} fill="none" stroke={color} strokeWidth={(sw * 32) / s} opacity={opacity} strokeLinecap="square" strokeLinejoin="miter">
    <path d="M6 2.5 H20 L26 8.5 V29.5 H6 Z" />
    <path d="M20 2.5 V8.5 H26" />
    <polyline points="13,14 9.5,18.5 13,23" />
    <polyline points="19,14 22.5,18.5 19,23" />
  </g>
);

export const IconKey: React.FC<P> = ({x, y, s, color, sw = 2, opacity = 1}) => (
  <g transform={g(x, y, s)} fill="none" stroke={color} strokeWidth={(sw * 32) / s} opacity={opacity} strokeLinecap="square" strokeLinejoin="miter">
    <circle cx={10} cy={16} r={6.5} />
    <circle cx={10} cy={16} r={2} fill={color} stroke="none" />
    <line x1={16.5} y1={16} x2={29} y2={16} />
    <line x1={24} y1={16} x2={24} y2={21} />
    <line x1={28.5} y1={16} x2={28.5} y2={20} />
  </g>
);

/** Check mark drawn with a progress value (0..1) for a stroke-on reveal. */
export const Check: React.FC<{x: number; y: number; s: number; color: string; progress: number; sw?: number}> = ({
  x,
  y,
  s,
  color,
  progress,
  sw = 2.5,
}) => {
  const len = 1.2 * s;
  return (
    <polyline
      points={`${x + s * 0.2},${y + s * 0.52} ${x + s * 0.42},${y + s * 0.74} ${x + s * 0.82},${y + s * 0.28}`}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeDasharray={`${len} ${len}`}
      strokeDashoffset={len * (1 - progress)}
    />
  );
};

export const ICONS = [IconCalendar, IconCard, IconBell, IconChat] as const;
