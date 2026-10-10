import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../i18n';

/**
 * Loads a screen's data each time the screen comes into view, so coming back
 * from an edit shows the change, and again whenever `deps` change (e.g. the
 * selected shop or a chosen period). The spinner shows for the first load and
 * after `deps` change — the old data belongs to something else then (another
 * shop's products) and must not stay on screen; a plain refresh updates in
 * place. Only the latest request's answer is ever shown, so a slow reply for
 * the previous shop can't land on top of the current one.
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;
  const latest = useRef(0);

  const reload = useCallback(async (pulled = false) => {
    const request = ++latest.current;
    if (pulled) setRefreshing(true);
    try {
      const result = await loadRef.current();
      if (request !== latest.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (request !== latest.current) return;
      setError(e instanceof Error ? e.message : t('Something went wrong'));
    } finally {
      if (request === latest.current) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // The focus load covers the first render; this only follows later changes.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setData(undefined);
    setError(null);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    setData,
    error,
    loading: data === undefined && !error,
    refreshing,
    reload,
    refresh: () => reload(true),
  };
}
