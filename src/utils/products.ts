import { Product, Variant, VariationOption } from '../types/models';

export type SaleState = 'none' | 'scheduled' | 'running' | 'ended';

/**
 * Where a product's sale stands at `now`. The sale price applies only between
 * its dates, so a sale starts and ends by itself — nothing has to flip it.
 */
export function saleState(p: Product, now = new Date()): SaleState {
  if (p.salePrice == null) return 'none';
  if (p.saleStart && now < new Date(p.saleStart)) return 'scheduled';
  // As on Fazl: over at its end time exactly.
  if (p.saleEnd && now >= new Date(p.saleEnd)) return 'ended';
  return 'running';
}

/** The price a customer pays right now. */
export function currentPrice(p: Product, now = new Date()): number {
  return saleState(p, now) === 'running' ? (p.salePrice as number) : p.price;
}

export function totalStock(p: Product): number {
  return p.variants.length
    ? p.variants.reduce((sum, v) => sum + v.stock, 0)
    : p.stock;
}

export type StockState = 'in_stock' | 'low' | 'out';

export function stockState(p: Product, lowThreshold: number): StockState {
  const stock = totalStock(p);
  if (stock <= 0) return 'out';
  if (stock <= lowThreshold) return 'low';
  return 'in_stock';
}

/**
 * Every combination of the options' values, keeping the stock and price of
 * combinations that already existed so editing the options doesn't lose them.
 */
export function buildVariants(
  options: VariationOption[],
  previous: Variant[],
): Variant[] {
  const filled = options.filter(o => o.name.trim() && o.values.length);
  if (!filled.length) return [];
  let labels: string[][] = [[]];
  for (const option of filled) {
    labels = labels.flatMap(prefix => option.values.map(v => [...prefix, v]));
  }
  const old = new Map(previous.map(v => [v.label, v]));
  return labels.map(parts => {
    const label = parts.join(' / ');
    return old.get(label) ?? { label, stock: 0 };
  });
}
