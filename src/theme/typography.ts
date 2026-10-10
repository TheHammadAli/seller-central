import { I18nManager, TextStyle } from 'react-native';

// The language is fixed for the app's run (see src/i18n), so the fonts are
// too: Lato for English, as the Fazl app; IBM Plex Sans Arabic for Urdu, as
// the Fazl app does for right-to-left text (assets/fonts).
const urdu = I18nManager.isRTL;

export const fonts = urdu
  ? {
      light: 'IBMPlexSansArabic-Regular',
      regular: 'IBMPlexSansArabic-Regular',
      bold: 'IBMPlexSansArabic-Bold',
      black: 'IBMPlexSansArabic-Bold',
    }
  : {
      light: 'Lato-Light',
      regular: 'Lato-Regular',
      bold: 'Lato-Bold',
      black: 'Lato-Black',
    };

export type TextVariant =
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyBold'
  | 'label'
  | 'caption'
  | 'small';

/** Urdu script sits taller than Latin, so its lines need more room. */
const line = (height: number) => (urdu ? Math.round(height * 1.35) : height);

export const textVariants: Record<TextVariant, TextStyle> = {
  title: { fontFamily: fonts.black, fontSize: 24, lineHeight: line(30) },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: line(24) },
  subheading: { fontFamily: fonts.bold, fontSize: 16, lineHeight: line(22) },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: line(20) },
  bodyBold: { fontFamily: fonts.bold, fontSize: 14, lineHeight: line(20) },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: line(18) },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: line(16) },
  small: { fontFamily: fonts.bold, fontSize: 11, lineHeight: line(14) },
};
