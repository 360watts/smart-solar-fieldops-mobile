import type { Theme as NavigationTheme } from '@react-navigation/native';

export const AppTheme = {
  colors: {
    // ── Base surfaces ──────────────────────────────────────────────────────
    bg:           '#080C10',          // near-black, cool dark slate
    surface:      '#0D1218',          // slightly lifted
    card:         '#111820',          // card background
    cardElevated: '#16202C',          // modals / elevated sheets

    // ── Text ──────────────────────────────────────────────────────────────
    text:         '#EDF2F7',          // near-white, slightly warm
    mutedText:    'rgba(237,242,247,0.55)',
    dimText:      'rgba(237,242,247,0.32)',

    // ── Borders ───────────────────────────────────────────────────────────
    border:       'rgba(255,255,255,0.09)',
    borderMuted:  'rgba(255,255,255,0.05)',
    borderAccent: 'rgba(0,200,80,0.28)',

    // ── Brand — solar green ────────────────────────────────────────────────
    accent:       '#00C853',          // vivid solar green
    accentSoft:   'rgba(0,200,83,0.14)',
    accentGlow:   'rgba(0,200,83,0.22)',

    // ── Semantic status ───────────────────────────────────────────────────
    success:      '#00C853',
    successSoft:  'rgba(0,200,83,0.14)',
    danger:       '#FF4D4D',
    dangerSoft:   'rgba(255,77,77,0.14)',
    warning:      '#FFB020',
    warningSoft:  'rgba(255,176,32,0.14)',
    info:         '#4B9EFF',
    infoSoft:     'rgba(75,158,255,0.14)',

    // ── Chart lines ───────────────────────────────────────────────────────
    pvColor:      '#00C853',
    loadColor:    '#CBD5E1',
    gridColor:    '#4B9EFF',
    battColor:    '#FFB020',
  },

  gradients: {
    loginBg:      ['#000000', '#040C06', '#000000'] as string[],
    accentStripe: ['rgba(0,200,83,0.22)', 'rgba(0,200,83,0)'] as string[],
    solar:        ['#FFB020', '#F97316'] as string[],
    danger:       ['rgba(255,77,77,0.22)', 'rgba(255,77,77,0)'] as string[],
  },

  radii: {
    xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 28, full: 999,
  },

  animation: {
    fast: 150, normal: 250, slow: 400,
    spring: { damping: 20, stiffness: 300 },
  },

  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
  },

  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.30,
      shadowRadius: 10,
      elevation: 5,
    },
    glow: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.50,
      shadowRadius: 14,
      elevation: 7,
    }),
  },

  statusBarStyle: 'light' as const,

  navigation: {
    dark: true,
    colors: {
      primary:      '#00C853',
      background:   '#080C10',
      card:         '#0D1218',
      text:         '#EDF2F7',
      border:       'rgba(255,255,255,0.09)',
      notification: '#FF4D4D',
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium:  { fontFamily: 'System', fontWeight: '500' as const },
      bold:    { fontFamily: 'System', fontWeight: '700' as const },
      heavy:   { fontFamily: 'System', fontWeight: '800' as const },
    },
  } satisfies NavigationTheme,
};
