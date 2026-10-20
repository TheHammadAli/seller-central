import { Check, CreditCard, Smartphone } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { buyCoins, CoinMethod, CoinOptions, CoinPurchase, getCoinOptions, getCoinPurchase } from '../../api/coins';
import {
  AppText,
  Button,
  Card,
  Header,
  IconCircle,
  Screen,
  SectionHeader,
  StateView,
  TextField,
} from '../../components';
import { RootScreenProps } from '../../navigation/types';
import { colors, radius, spacing, themedStyles } from '../../theme';
import { formatRs } from '../../utils/format';
import { t } from '../../i18n';

/** A pending purchase is checked this often, for this long. */
const POLL_MS = 5000;
const POLL_FOR_MS = 3 * 60 * 1000;

/** 03XXXXXXXXX, +92 3XX XXXXXXX and the like. */
const MOBILE_RE = /^(?:\+?92|0092|0)?3\d{9}$/;

const METHODS: { method: CoinMethod; label: string; hint: string }[] = [
  { method: 'jazzcash', label: 'JazzCash', hint: t('Pay from your JazzCash account') },
  { method: 'easypaisa', label: 'Easypaisa', hint: t('Pay from your Easypaisa account') },
  { method: 'card', label: t('Debit or credit card'), hint: t('Opens a secure card page') },
];

/** form → phone (approving on the phone) | card (paying in the browser) | pending (waiting for the gateway) */
type Stage = 'form' | 'phone' | 'card' | 'pending';

/**
 * Adding money to the owner's Fazl wallet with JazzCash, Easypaisa or a card
 * (a top-up — money, not coins), as in the Fazl app. Opened from Create shop
 * when the wallet can't cover another shop's fee (`needed`, rupees).
 *
 * A mobile account is charged straight away and approved on the owner's
 * phone while this screen waits; a card opens JazzCash's card page in the
 * browser, and the purchase is checked when the owner comes back.
 */
export function AddCoinsScreen({ navigation, route }: RootScreenProps<'AddCoins'>) {
  const needed = route.params?.needed;
  const [options, setOptions] = useState<CoinOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amount, setAmount] = useState(needed ? String(Math.ceil(needed)) : '');
  const [method, setMethod] = useState<CoinMethod | null>(null);
  const [mobile, setMobile] = useState('');
  const [cnic, setCnic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('form');
  const [tracked, setTracked] = useState<{ id: string; since: number } | null>(null);
  const checkoutUrl = useRef<string | null>(null);
  const mounted = useRef(true);
  // The purchase still open. Cleared the moment it settles, so the poll and
  // the come-back check can't both report it.
  const activeId = useRef<string | null>(null);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const loadOptions = useCallback(() => {
    setLoadError(null);
    getCoinOptions()
      .then(o => {
        setOptions(o);
        setMethod(m => m ?? METHODS.find(x => o.available[x.method])?.method ?? null);
        // What the shop needs, raised to the smallest amount Fazl sells.
        setAmount(a => (a && Number(a) < o.min ? String(o.min) : a));
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : t('Something went wrong')));
  }, []);

  useEffect(loadOptions, [loadOptions]);

  /** Acts on a purchase that has settled; false while it's still pending. */
  const finish = useCallback(
    (p: CoinPurchase) => {
      if (!mounted.current || p.id !== activeId.current) return true;
      if (p.status === 'pending') return false;
      activeId.current = null;
      setTracked(null);
      if (p.status === 'completed') {
        Alert.alert(
          t('Money added'),
          t('{amount} is now in your Fazl wallet.', { amount: formatRs(p.amount) }),
          [{ text: t('OK'), onPress: () => navigation.goBack() }],
          { cancelable: false },
        );
      } else {
        setStage('form');
        setError(
          `${t('The payment did not go through')}${p.failureMessage ? `: ${p.failureMessage}` : ''}. ${t(
            'You were not charged.',
          )}`,
        );
      }
      return true;
    },
    [navigation],
  );

  const check = useCallback(() => {
    if (!tracked) return;
    getCoinPurchase(tracked.id)
      .then(finish)
      .catch(() => undefined);
  }, [tracked, finish]);

  // While a purchase is open: check it every few seconds for a few minutes,
  // and whenever the app comes back to the front (after the card page).
  useEffect(() => {
    if (!tracked) return undefined;
    const timer = setInterval(() => {
      if (Date.now() - tracked.since < POLL_FOR_MS) check();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [tracked, check]);

  if (!options) {
    return (
      <Screen header={<Header title={t('Add money')} />} scroll={false}>
        <StateView error={loadError} onRetry={loadOptions} />
      </Screen>
    );
  }

  const value = Number(amount);
  const isMobile = method === 'jazzcash' || method === 'easypaisa';

  const pay = async () => {
    if (!Number.isInteger(value) || value < options.min || value > options.max) {
      setError(t('Enter an amount from {min} to {max}.', { min: formatRs(options.min), max: formatRs(options.max) }));
      return;
    }
    if (!method) return;
    if (isMobile && !MOBILE_RE.test(mobile.replace(/[\s-]/g, ''))) {
      setError(t('Enter the 11-digit mobile number, e.g. 03001234567'));
      return;
    }
    if (method === 'jazzcash' && !/^\d{6}$/.test(cnic)) {
      setError(t('Enter the last 6 digits of the CNIC on the JazzCash account.'));
      return;
    }
    setError(null);
    if (isMobile) setStage('phone');
    try {
      const res = await buyCoins({ amount: value, method, mobileNumber: mobile.trim(), cnicLast6: cnic });
      activeId.current = res.purchase.id;
      if (res.checkoutUrl) {
        checkoutUrl.current = res.checkoutUrl;
        setTracked({ id: res.purchase.id, since: Date.now() });
        setStage('card');
        Linking.openURL(res.checkoutUrl).catch(() => undefined);
        return;
      }
      if (finish(res.purchase)) return;
      setTracked({ id: res.purchase.id, since: Date.now() });
      setStage('pending');
    } catch (e) {
      if (!mounted.current) return;
      setStage('form');
      setError(e instanceof Error ? e.message : t('Something went wrong'));
    }
  };

  if (stage !== 'form') {
    return (
      <Screen header={<Header title={t('Add money')} />}>
        <View style={styles.waiting}>
          <ActivityIndicator color={colors.primary} size="large" />
          <AppText variant="subheading" align="center">
            {stage === 'phone'
              ? t('Approve the payment on your phone')
              : stage === 'card'
                ? t('Finish paying on the card page')
                : t('Waiting for the payment to be confirmed')}
          </AppText>
          <AppText color={colors.textMuted} align="center">
            {stage === 'phone'
              ? t('{name} has sent a request to {number}. Enter your MPIN there to pay {amount}.', {
                  name: method === 'jazzcash' ? 'JazzCash' : 'Easypaisa',
                  number: mobile.trim(),
                  amount: formatRs(value),
                })
              : stage === 'card'
                ? t('Pay {amount} in the browser, then come back here. The money is added once JazzCash confirms it.', {
                    amount: formatRs(value),
                  })
                : t('This can take a minute. You can leave this screen; the money is added either way.')}
          </AppText>
          {stage === 'card' ? (
            <>
              <Button
                title={t('Open the card page again')}
                variant="outline"
                onPress={() => checkoutUrl.current && Linking.openURL(checkoutUrl.current).catch(() => undefined)}
                style={styles.stretch}
              />
              <Button title={t("I've paid, check now")} variant="ghost" onPress={check} style={styles.stretch} />
            </>
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title={t('Add money')} />}
      footer={
        <Button
          title={value > 0 ? t('Pay {amount}', { amount: formatRs(value) }) : t('Pay')}
          flex
          disabled={!options.enabled || !method || !value}
          onPress={pay}
        />
      }
    >
      <AppText color={colors.textMuted} style={styles.intro}>
        {t('The money goes into your Fazl wallet, and Fazl takes the fee for another shop from it.')}
      </AppText>
      {!options.enabled ? (
        <AppText variant="label" color={colors.danger} style={styles.intro}>
          {t('Adding money is paused for now. Please try again later.')}
        </AppText>
      ) : null}

      {options.presets.length ? (
        <View style={styles.chips}>
          {options.presets.map(p => {
            const on = value === p;
            return (
              <Pressable
                key={p}
                onPress={() => {
                  setAmount(String(p));
                  setError(null);
                }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <AppText variant="label" color={on ? colors.white : colors.text}>
                  {formatRs(p)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <TextField
        label={t('Amount')}
        prefix={t('Rs')}
        value={amount}
        onChangeText={v => {
          setAmount(v.replace(/[^0-9]/g, ''));
          setError(null);
        }}
        keyboardType="number-pad"
        placeholder={String(options.min)}
        hint={
          needed
            ? t('You need {amount} more for your new shop.', { amount: formatRs(needed) })
            : t('From {min} to {max}', { min: formatRs(options.min), max: formatRs(options.max) })
        }
      />

      <SectionHeader title={t('Pay with')} />
      <Card padded={false}>
        {METHODS.map((m, i) => {
          const available = options.available[m.method];
          const chosen = m.method === method;
          return (
            <Pressable
              key={m.method}
              disabled={!available}
              onPress={() => {
                setMethod(m.method);
                setError(null);
              }}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.border,
                !available && styles.off,
                pressed && styles.pressed,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen, disabled: !available }}
            >
              <IconCircle icon={m.method === 'card' ? CreditCard : Smartphone} tone="primary" size={36} />
              <View style={styles.flex}>
                <AppText variant="bodyBold">{m.label}</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {available ? m.hint : t('Not available yet')}
                </AppText>
              </View>
              <View style={[styles.radio, chosen && styles.radioOn]}>
                {chosen ? <Check size={14} color={colors.white} /> : null}
              </View>
            </Pressable>
          );
        })}
      </Card>

      {isMobile ? (
        <View style={styles.fields}>
          <TextField
            label={t('{name} mobile number', { name: method === 'jazzcash' ? 'JazzCash' : 'Easypaisa' })}
            value={mobile}
            onChangeText={v => {
              setMobile(v.replace(/[^0-9+]/g, ''));
              setError(null);
            }}
            keyboardType="phone-pad"
            maxLength={13}
            placeholder="03001234567"
          />
          {method === 'jazzcash' ? (
            <TextField
              label={t('Last 6 digits of CNIC')}
              value={cnic}
              onChangeText={v => {
                setCnic(v.replace(/\D/g, ''));
                setError(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              hint={t('Of the CNIC the JazzCash account is registered on')}
            />
          ) : null}
        </View>
      ) : null}

      {error ? (
        <AppText variant="label" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    intro: { marginBottom: spacing.lg },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
    border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    off: { opacity: 0.5 },
    pressed: { opacity: 0.7 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    fields: { marginTop: spacing.lg },
    error: { marginTop: spacing.md },
    waiting: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl },
    stretch: { alignSelf: 'stretch' },
  }),
);
