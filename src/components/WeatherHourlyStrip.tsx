import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { AppTheme } from '../theme/theme';

function getWeatherIcon(cloud: number, ghi: number, precip: number | null): keyof typeof Feather.glyphMap {
  if (ghi < 10) return 'moon';
  if (precip != null && precip > 60) return 'cloud-rain';
  if (precip != null && precip > 30) return cloud > 40 ? 'cloud-drizzle' : 'cloud';
  if (cloud > 75) return 'cloud';
  if (cloud > 40) return 'cloud';
  return 'sun';
}

/** Compass wind direction arrow rendered in SVG */
function WindArrow({ degrees, color }: { degrees: number; color: string }) {
  // Arrow points up (north) at 0°, rotates clockwise
  const rad = ((degrees - 90) * Math.PI) / 180;
  const cx = 10, cy = 10, r = 7;
  const ax = cx + r * Math.cos(rad - 0.35);
  const ay = cy + r * Math.sin(rad - 0.35);
  const bx = cx + r * Math.cos(rad + 0.35);
  const by = cy + r * Math.sin(rad + 0.35);
  const tx = cx + r * Math.cos(rad);
  const ty = cy + r * Math.sin(rad);
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={8} stroke={color} strokeWidth={1} fill="transparent" opacity={0.3} />
      <Path d={`M${ax.toFixed(1)},${ay.toFixed(1)} L${tx.toFixed(1)},${ty.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)}`} fill={color} opacity={0.85} />
    </Svg>
  );
}

export function WeatherHourlyStrip({ hourly }: { hourly: any[] }) {
  if (!hourly || hourly.length === 0) return null;

  return (
    <View style={{
      backgroundColor: AppTheme.colors.card,
      borderColor: AppTheme.colors.border,
      borderWidth: 1,
      borderRadius: AppTheme.radii.lg,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 14,
    }}>
      <Text style={{ color: AppTheme.colors.mutedText, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
        24 H Weather Outlook
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
        {hourly.map((h, i) => {
          const time = (() => {
            try {
              return new Date(h.forecast_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
            } catch { return ''; }
          })();
          const cloud = h.cloud_cover_pct ?? 0;
          const ghi = h.ghi_wm2 ?? 0;
          const temp = Number(h.temperature_c ?? 0);
          const wind = Number(h.wind_speed_ms ?? 0);
          const windDir = Number(h.wind_direction_deg ?? 0);
          const precip = h.precip_prob_pct != null ? Number(h.precip_prob_pct) : null;
          const isNow = i === 0;
          const iconName = getWeatherIcon(cloud, ghi, precip);
          const ghiPct = Math.min(100, (ghi / 900) * 100);
          const ghiColor = ghi > 600 ? '#f97316' : ghi > 200 ? AppTheme.colors.warning : AppTheme.colors.mutedText;
          const precipColor = precip == null ? AppTheme.colors.dimText : precip > 60 ? '#1d4ed8' : precip > 30 ? AppTheme.colors.info : '#93c5fd';

          return (
            <View
              key={i}
              style={{
                alignItems: 'center',
                backgroundColor: isNow ? AppTheme.colors.accentSoft : 'rgba(255,255,255,0.025)',
                borderColor: isNow ? AppTheme.colors.borderAccent : AppTheme.colors.borderMuted,
                borderWidth: 1,
                borderRadius: AppTheme.radii.md,
                paddingVertical: 10,
                paddingHorizontal: 9,
                minWidth: 74,
                gap: 3,
                position: 'relative',
              }}
            >
              {isNow && (
                <View style={{ position: 'absolute', top: -9, backgroundColor: AppTheme.colors.accent, paddingHorizontal: 7, paddingVertical: 2, borderRadius: AppTheme.radii.xs }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }}>NOW</Text>
                </View>
              )}

              <Text style={{ color: AppTheme.colors.dimText, fontSize: 10, fontWeight: '600', marginTop: isNow ? 4 : 0 }}>{time}</Text>

              <Feather name={iconName} size={20} color={isNow ? AppTheme.colors.accent : AppTheme.colors.text} style={{ marginVertical: 3 }} />

              <Text style={{ color: AppTheme.colors.text, fontSize: 14, fontWeight: '800' }}>{temp.toFixed(1)}°</Text>

              {/* GHI bar */}
              <View style={{ width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                <View style={{ width: `${ghiPct}%`, height: '100%', backgroundColor: ghiColor, borderRadius: 2 }} />
              </View>
              <Text style={{ color: AppTheme.colors.dimText, fontSize: 9 }}>{Math.round(ghi)} W/m²</Text>

              {/* Precipitation */}
              {precip != null && (
                <>
                  <View style={{ width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                    <View style={{ width: `${precip}%`, height: '100%', backgroundColor: precipColor, borderRadius: 2 }} />
                  </View>
                  <Text style={{ color: precipColor, fontSize: 9, fontWeight: '600' }}>{Math.round(precip)}%</Text>
                </>
              )}

              {/* Wind speed + direction arrow */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                {h.wind_direction_deg != null && <WindArrow degrees={windDir} color={AppTheme.colors.dimText} />}
                <Text style={{ color: AppTheme.colors.dimText, fontSize: 9 }}>{wind.toFixed(1)} m/s</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
