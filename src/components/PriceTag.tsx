import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Product } from '../types/models';
import { formatRs } from '../utils/format';
import { currentPrice, saleState } from '../utils/products';
import { AppText } from './AppText';

/** The price a customer sees now, with the regular price struck through during a sale. */
export function PriceTag({ product }: { product: Product }) {
  const onSale = saleState(product) === 'running';
  return (
    <View style={styles.row}>
      <AppText variant="bodyBold" color={onSale ? colors.danger : colors.price}>
        {formatRs(currentPrice(product))}
      </AppText>
      {onSale ? (
        <AppText variant="caption" color={colors.textSubtle} style={styles.struck}>
          {formatRs(product.price)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  struck: { textDecorationLine: 'line-through' },
});
