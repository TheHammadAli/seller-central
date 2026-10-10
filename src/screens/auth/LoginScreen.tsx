import { Languages, Lock, Store } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  TextInputInstance,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppleButton } from '@invertase/react-native-apple-authentication';
import { isAppleSignInAvailable } from '../../api/apple';
import GoogleIcon from '../../assets/icons/google.png';
import { AppText, DoodleButton, IconCircle, OutlinedField, Screen } from '../../components';
import { useAuth } from '../../state/AuthContext';
import { colors, fonts, spacing, themedStyles } from '../../theme';
import { LANGUAGE_NAMES } from '../../utils/chooseLanguage';
import { isUrdu, setLanguage, t } from '../../i18n';

export function LoginScreen() {
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState<'email' | 'google' | 'apple' | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const submit = async () => {
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t('Enter a valid email');
    if (!password) next.password = t('Enter your password');
    setErrors(next);
    if (next.email || next.password) return;

    setLoading('email');
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : t('Could not log in') });
      setLoading(null);
    }
  };

  const google = async () => {
    setErrors({});
    setLoading('google');
    try {
      // Only an email already registered on Fazl gets in; the backend says
      // so otherwise and that message is shown here.
      await signInWithGoogle();
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : t('Google sign-in failed') });
    }
    // Still here after a cancel or an error; after a login this screen is gone.
    setLoading(null);
  };

  // Sign in with Apple (iPhone): only an Apple ID already on a Fazl account
  // gets in, as with Google; the backend's message is shown otherwise.
  const apple = async () => {
    if (loading) return;
    setErrors({});
    setLoading('apple');
    try {
      await signInWithApple();
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : t('Apple sign-in failed') });
    }
    setLoading(null);
  };

  return (
    <Screen background={colors.surface} contentStyle={styles.content}>
      {/* The other language, in its own words; nothing to lose here, so no question. */}
      <Pressable
        style={styles.language}
        hitSlop={8}
        onPress={() => setLanguage(isUrdu ? 'en' : 'ur')}
        accessibilityRole="button"
      >
        <Languages size={16} color={colors.primary} />
        <AppText variant="label" color={colors.primary}>
          {LANGUAGE_NAMES[isUrdu ? 'en' : 'ur']}
        </AppText>
      </Pressable>

      <View style={styles.brand}>
        <IconCircle icon={Store} size={72} />
        <AppText variant="title" align="center">
          {t('Fazl Seller Central')}
        </AppText>
        <AppText color={colors.textMuted} align="center">
          {t("Manage your shop's products, orders and deliveries. Log in with your Fazl account.")}
        </AppText>
      </View>

      <OutlinedField
        label={t('Email Address')}
        value={email}
        onChangeText={text => {
          setEmail(text);
          setErrors(e => ({ ...e, email: undefined, form: undefined }));
        }}
        placeholder={t('you@example.com')}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={errors.email}
      />
      <OutlinedField
        ref={passwordRef}
        label={t('Password')}
        password
        value={password}
        onChangeText={text => {
          setPassword(text);
          setErrors(e => ({ ...e, password: undefined, form: undefined }));
        }}
        placeholder="•••••••••"
        returnKeyType="done"
        onSubmitEditing={submit}
        error={errors.password}
      />

      <Pressable
        style={styles.forgot}
        hitSlop={8}
        onPress={() =>
          Alert.alert(t('Forgot password'), t('Reset your password from the Fazl app, then log in here with the new one.'))
        }
      >
        <AppText style={styles.forgotText}>{t('Forgot Password?')}</AppText>
      </Pressable>

      {errors.form ? (
        <View style={styles.formError}>
          <Lock size={16} color={colors.danger} />
          <AppText color={colors.danger} style={styles.flex}>
            {errors.form}
          </AppText>
        </View>
      ) : null}

      <DoodleButton
        title={t('Log in')}
        onPress={submit}
        loading={loading === 'email'}
        loadingText={t('Logging in')}
        disabled={loading !== null || !email.trim() || !password}
      />

      <View style={styles.divider}>
        <View style={styles.line} />
        <AppText color={colors.textMuted}>{t('or')}</AppText>
        <View style={styles.line} />
      </View>

      <TouchableOpacity
        style={styles.google}
        onPress={google}
        disabled={loading !== null}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {loading === 'google' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Image source={GoogleIcon} style={styles.googleIcon} />
            <AppText style={styles.googleText}>{t('Continue with Google')}</AppText>
          </>
        )}
      </TouchableOpacity>

      {/* Apple's own button, iPhone only (as in the Fazl app). */}
      {isAppleSignInAvailable ? (
        <AppleButton
          buttonStyle={AppleButton.Style.BLACK}
          buttonType={AppleButton.Type.CONTINUE}
          cornerRadius={12}
          style={[styles.apple, loading !== null && styles.dimmed]}
          onPress={apple}
        />
      ) : null}

      <AppText variant="caption" color={colors.textMuted} align="center" style={styles.note}>
        {t("Log in with your Fazl account. Don't have a shop yet? You can create one here after logging in.")}
      </AppText>
    </Screen>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingHorizontal: 20 },
  language: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.lg,
  },
  brand: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxl },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: spacing.xl },
  forgotText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  flex: { flex: 1 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  // Fazl's "Continue with Google" button.
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
    gap: 12,
  },
  googleIcon: { width: 22, height: 22 },
  apple: { width: '100%', height: 56, marginTop: spacing.md },
  dimmed: { opacity: 0.6 },
  googleText: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  note: { marginTop: spacing.xl },
}));
