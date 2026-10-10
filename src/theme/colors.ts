// The Fazl app's palette (Native-fazl-app/src/constants/colors.js), so the two
// apps read as one product. Each status colour has a soft tint for badge and
// icon backgrounds.
const light = {
  primary: '#007781',
  primaryDark: '#005F67',
  primarySoft: '#E6F4F5',
  primaryTint: '#C7F1EE',

  secondary: '#FF6B35',
  secondarySoft: '#FFF0EA',

  text: '#030303',
  textMuted: '#757575',
  textSubtle: '#9E9E9E',
  textInverse: '#FFFFFF',

  background: '#F5F7F7',
  surface: '#FFFFFF',
  border: '#E5E5E5',
  divider: '#EEF2F3',

  success: '#16A34A',
  successSoft: '#E8F5E9',
  warning: '#E08600',
  warningSoft: '#FFF4E0',
  danger: '#E53935',
  dangerSoft: '#FFEBEE',
  info: '#1E88E5',
  infoSoft: '#E3F2FD',
  purple: '#7C3AED',
  purpleSoft: '#F3E8FF',

  price: '#3C9197',
  overlay: 'rgba(0,0,0,0.45)',
  white: '#FFFFFF',
  black: '#000000',
};

export type Palette = typeof light;

/**
 * Dark mode (Settings > Appearance): the teal stays the same teal, text is
 * near-white (gray-50), and backgrounds are dark. `white` stays white — it is
 * what sits on teal (button text, icons on the banner).
 */
const dark: Palette = {
  primary: '#007781',
  primaryDark: '#005F67',
  primarySoft: '#0E3236',
  primaryTint: '#C7F1EE',

  secondary: '#FF6B35',
  secondarySoft: '#3A2117',

  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  textSubtle: '#6B7280',
  textInverse: '#030303',

  background: '#0B0F12',
  surface: '#151B1F',
  border: '#2A3338',
  divider: '#1E262A',

  success: '#22C55E',
  successSoft: '#0F2A1A',
  warning: '#F59E0B',
  warningSoft: '#2D2410',
  danger: '#EF5350',
  dangerSoft: '#3A1517',
  info: '#60A5FA',
  infoSoft: '#12263A',
  purple: '#A78BFA',
  purpleSoft: '#241A3A',

  price: '#3C9197',
  overlay: 'rgba(0,0,0,0.6)',
  white: '#FFFFFF',
  black: '#000000',
};

export type ColorScheme = 'light' | 'dark';

let scheme: ColorScheme = 'light';

/** Which palette `colors` reads from; set by the app root (see AppearanceProvider). */
export function setColorScheme(next: ColorScheme) {
  scheme = next;
}

export function colorScheme(): ColorScheme {
  return scheme;
}

/**
 * The current palette. Every colour is read when it's used, so a screen drawn
 * after the scheme changes gets the new one; styles made once at load are
 * made per scheme instead (see themedStyles).
 */
export const colors: Palette = Object.defineProperties(
  {} as Palette,
  Object.fromEntries(
    (Object.keys(light) as (keyof Palette)[]).map(key => [
      key,
      { enumerable: true, get: () => (scheme === 'dark' ? dark : light)[key] },
    ]),
  ),
);

export type Tone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'secondary'
  | 'neutral';

const TONE: Record<Tone, [keyof Palette, keyof Palette]> = {
  primary: ['primary', 'primarySoft'],
  success: ['success', 'successSoft'],
  warning: ['warning', 'warningSoft'],
  danger: ['danger', 'dangerSoft'],
  info: ['info', 'infoSoft'],
  purple: ['purple', 'purpleSoft'],
  secondary: ['secondary', 'secondarySoft'],
  neutral: ['textMuted', 'divider'],
};

/** Each tone's colour and soft tint, from the current palette. */
export const toneColors: Record<Tone, { fg: string; bg: string }> = Object.defineProperties(
  {} as Record<Tone, { fg: string; bg: string }>,
  Object.fromEntries(
    (Object.keys(TONE) as Tone[]).map(tone => [
      tone,
      { enumerable: true, get: () => ({ fg: colors[TONE[tone][0]], bg: colors[TONE[tone][1]] }) },
    ]),
  ),
);
