import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import GoogleIcon from '../../assets/icons/google.png';
import { createFazlAccount, sendSignupCode, verifySignupCode, sendPhoneSignupCode, verifyPhoneSignupCode, validSignupPassword } from '../../api/account';
import { AppText, DoodleButton, Header, OutlinedField, Screen } from '../../components';
import { RootScreenProps } from '../../navigation/types';
import { useAuth } from '../../state/AuthContext';
import { colors, spacing, themedStyles } from '../../theme';
import { t } from '../../i18n';
import { AccountDetails, pakistanPhone } from '../../utils/accountProfile';
import { AccountDetailsForm } from './AccountDetailsForm';

type Stage = 'contact' | 'code' | 'password' | 'details';
export function SignupScreen({ navigation }: RootScreenProps<'Signup'>) {
  const { signIn, signInWithGoogle } = useAuth();
  const [stage, setStage] = useState<Stage>('contact');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [usingGoogle, setUsingGoogle] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState('');
  const [resendAfter, setResendAfter] = useState(0);
  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const contactValid = method === 'email' ? emailValid : /^\+923\d{9}$/.test(pakistanPhone(phone));
  const contact = method === 'email' ? email.trim().toLowerCase() : pakistanPhone(phone);
  useEffect(() => {
    if (resendAfter <= 0) return;
    const timer = setTimeout(() => setResendAfter(n => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendAfter]);

  const send = async () => {
    if (loading || (stage === 'code' && resendAfter > 0)) return;
    if (!contactValid) { setError(t(method === 'email' ? 'Enter a valid email' : 'Enter a valid Pakistani mobile number')); return; }
    setLoading(true); setError('');
    try {
      if (method === 'email') await sendSignupCode(email); else await sendPhoneSignupCode(phone);
      setCode(''); setStage('code'); setResendAfter(60);
    } catch (e) { setError(e instanceof Error ? e.message : t('Please try again')); }
    finally { setLoading(false); }
  };
  const verify = async () => {
    if (loading) return;
    if (!/^\d{6}$/.test(code)) { setError(t('Enter the 6-digit verification code')); return; }
    setLoading(true); setError('');
    try {
      if (method === 'email') await verifySignupCode(email, code); else await verifyPhoneSignupCode(phone, code);
      setStage('password'); setCode('');
    } catch (e) { setError(e instanceof Error ? e.message : t('Please try again')); }
    finally { setLoading(false); }
  };
  const continuePassword = () => {
    if (!validSignupPassword(password)) { setError(t('Use at least 8 characters, a special character, and no spaces')); return; }
    if (password !== confirm) { setError(t("Passwords don't match")); return; }
    setError(''); setStage('details');
  };
  const login = async () => {
    if (loading) return;
    setLoading(true); setError('');
    try { await signIn(email.trim().toLowerCase(), password); }
    catch (e) { setError(e instanceof Error ? e.message : t('Could not log in')); }
    finally { setLoading(false); }
  };
  const create = async (details: AccountDetails) => {
    if (loading) return;
    if (!emailValid) { setError(t('Enter a valid email')); return; }
    if (!validSignupPassword(password) || password !== confirm) return;
    setLoading(true); setError('');
    try {
      await createFazlAccount(email, password, { ...details, roles: ['business_owner'], ...(method === 'phone' ? { phone: pakistanPhone(phone) } : {}) });
      setCreated(true);
      await signIn(email.trim().toLowerCase(), password);
    } catch (e) { setError(e instanceof Error ? e.message : t('Please try again')); }
    finally { setLoading(false); }
  };
  const google = async () => {
    if (loading) return;
    setLoading(true); setUsingGoogle(true); setError('');
    try { await signInWithGoogle(); }
    catch (e) { setError(e instanceof Error ? e.message : t('Google sign-in failed')); }
    finally { setLoading(false); setUsingGoogle(false); }
  };
  const back = () => {
    setError('');
    if (stage === 'details') setStage('password');
    else if (stage === 'code') { setStage('contact'); setCode(''); }
    else navigation.goBack();
  };

  return <Screen background={colors.surface} header={<Header title={t('Create your Fazl account')} />}>
    <AppText color={colors.textMuted} style={styles.intro}>{t('Create a business owner account for Fazl App and Seller Central.')}</AppText>
    {error ? <AppText accessibilityRole="alert" color={colors.danger} style={styles.error}>{error}</AppText> : null}
    {created ? <View><AppText style={styles.intro}>{t('Your account is created. Log in to continue.')}</AppText><DoodleButton title={t('Log in')} onPress={login} loading={loading} disabled={loading} /></View> : stage === 'details' ? <>
      <AppText variant="label" style={styles.intro}>{contact}</AppText>
      <AccountDetailsForm loading={loading} title={t('Create account')} onSubmit={create} referral verifiedPhone={method === 'phone' ? pakistanPhone(phone) : undefined}>
        {method === 'phone' ? <OutlinedField label={t('Email Address')} value={email} keyboardType="email-address" autoComplete="email" onChangeText={setEmail} editable={!loading} /> : null}
      </AccountDetailsForm>
      <Pressable disabled={loading} onPress={back} style={styles.link}><AppText color={colors.primary}>{t('Back')}</AppText></Pressable>
    </> : stage === 'password' ? <>
      <AppText variant="label" style={styles.intro}>{t('Create a password')}</AppText>
      <AppText color={colors.textMuted} style={styles.intro}>{t('Use at least 8 characters, a special character, and no spaces')}</AppText>
      <OutlinedField label={t('Choose a password')} password value={password} autoComplete="new-password" onChangeText={setPassword} editable={!loading} />
      <OutlinedField label={t('Confirm password')} password value={confirm} autoComplete="new-password" onChangeText={setConfirm} editable={!loading} />
      <DoodleButton title={t('Continue')} onPress={continuePassword} disabled={loading || !validSignupPassword(password) || password !== confirm} />
    </> : <>
      {method === 'email' ? <OutlinedField label={t('Email Address')} value={email} keyboardType="email-address" autoComplete="email" onChangeText={v => { setEmail(v); setError(''); }} editable={stage === 'contact' && !loading} /> : <OutlinedField label={t('Mobile number (Pakistan)')} value={phone} placeholder="+923001234567" keyboardType="phone-pad" autoComplete="tel" maxLength={18} onChangeText={v => { setPhone(v); setError(''); }} editable={stage === 'contact' && !loading} />}
      {stage === 'code' ? <>
        <AppText style={styles.intro}>{t('Enter the code sent to {email}', { email: contact })}</AppText>
        <OutlinedField label={t('Verification code')} value={code} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} onChangeText={v => setCode(v.replace(/\D/g, ''))} editable={!loading} />
        <DoodleButton title={method === 'email' ? t('Verify email') : t('Verify phone')} onPress={verify} loading={loading} disabled={loading || !/^\d{6}$/.test(code)} />
        <Pressable disabled={loading || resendAfter > 0} onPress={send} style={styles.link}><AppText color={resendAfter ? colors.textMuted : colors.primary}>{resendAfter ? t('Resend code in {seconds}s', { seconds: resendAfter }) : t('Resend code')}</AppText></Pressable>
        <Pressable disabled={loading} onPress={back} style={styles.link}><AppText color={colors.primary}>{method === 'email' ? t('Change email') : t('Change phone')}</AppText></Pressable>
      </> : <>
        <DoodleButton title={method === 'email' ? t('Continue with email') : t('Continue with phone')} onPress={send} loading={loading && !usingGoogle} disabled={loading || !contactValid} />
        <Pressable accessibilityRole="button" accessibilityLabel={method === 'email' ? t('Continue with phone') : t('Continue with email')} disabled={loading} onPress={() => { setMethod(method === 'email' ? 'phone' : 'email'); setError(''); }} style={styles.link}><AppText color={colors.primary}>{method === 'email' ? t('Continue with phone') : t('Continue with email')}</AppText></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Continue with Google')} disabled={loading} onPress={google} style={styles.google}>
          {usingGoogle ? <ActivityIndicator color={colors.primary} /> : <><Image source={GoogleIcon} style={styles.googleIcon} /><AppText variant="label">{t('Continue with Google')}</AppText></>}
        </Pressable>
      </>}
    </>}
    <Pressable disabled={loading} onPress={() => navigation.goBack()} style={styles.link}><AppText color={colors.primary}>{t('Already have an account? Log in')}</AppText></Pressable>
  </Screen>;
}

const styles = themedStyles(() => StyleSheet.create({
  intro: { marginBottom: spacing.lg }, error: { marginBottom: spacing.lg }, link: { alignItems: 'center', paddingVertical: spacing.md },
  google: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.lg, marginTop: spacing.lg },
  googleIcon: { width: 22, height: 22 },
}));
