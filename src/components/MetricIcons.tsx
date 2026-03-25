import React from 'react';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop, G } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

export function SolarIcon({ color, size = 20 }: IconProps) {
  const s = Number(size) || 20;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.6} />
        </LinearGradient>
      </Defs>
      <Circle cx="12" cy="12" r="5" fill="url(#solarGrad)" opacity={0.2} />
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <G opacity={0.8}>
        <Path d="M12 2V5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M12 19V22" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M4.93 4.93L7.05 7.05" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M16.95 16.95L19.07 19.07" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M2 12H5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M19 12H22" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M7.05 16.95L4.93 19.07" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M19.07 4.93L16.95 7.05" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

export function HomeIcon({ color, size = 20 }: IconProps) {
  const s = Number(size) || 20;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 21V12H15V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="15.5" y="6" width="2" height="3" fill={color} opacity={0.4} />
    </Svg>
  );
}

export function GridIcon({ color, size = 20 }: IconProps) {
  const s = Number(size) || 20;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path d="M7 2L17 2L19 22H5L7 2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M5 10H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M6 16H18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 2V22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M2 14L5 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M19 14L22 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function BatteryIcon({ color, size = 20, chargeLevel = 1 }: IconProps & { chargeLevel?: number }) {
  const s = Number(size) || 20;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M22 10V14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Rect
        x="4"
        y="8"
        width={14 * Math.max(0.1, Math.min(1, chargeLevel))}
        height="8"
        fill={color}
        opacity={0.8}
        rx="1"
      />
    </Svg>
  );
}

export function ZapIcon({ color, size = 20 }: IconProps) {
  const s = Number(size) || 20;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={color} opacity={0.2} />
      <Path
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const BoltIcon = ZapIcon;
