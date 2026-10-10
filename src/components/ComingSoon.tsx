import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { EmptyState } from './EmptyState';
import { Header } from './Header';
import { Screen } from './Screen';
import { t } from '../i18n';

/** A section whose Fazl side isn't built yet. */
export function ComingSoon({ title, icon, message }: { title: string; icon: LucideIcon; message: string }) {
  return (
    <Screen header={<Header title={title} />} scroll={false}>
      <EmptyState icon={icon} title={t('Coming soon')} message={message} />
    </Screen>
  );
}
