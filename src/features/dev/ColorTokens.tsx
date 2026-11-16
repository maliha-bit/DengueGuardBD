import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';
import { brandColors, contrastRatio, type BrandColor } from '@/lib/tokens';

const INK = brandColors.ink;
const WHITE = '#FFFFFF';

function Swatch({ name, hex }: { name: BrandColor; hex: string }) {
  const { i18n } = useTranslation();
  const onWhite = contrastRatio(hex, WHITE);
  const onInk = contrastRatio(hex, INK);
  const textColor = onInk >= onWhite ? INK : WHITE;
  const ratio = (value: number) =>
    formatNumber(value, i18n.language, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return (
    <li className="overflow-hidden rounded-2xl bg-white ring-1 ring-brand-line">
      <div
        className="flex h-20 items-end p-3 text-sm font-semibold"
        style={{ backgroundColor: hex, color: textColor }}
      >
        Aa
      </div>
      <div className="p-3">
        <p className="text-sm font-medium">brand-{name}</p>
        <p className="font-mono text-xs uppercase text-brand-muted">{hex}</p>
        <p className="mt-1 text-xs text-brand-muted">
          <span className="font-mono">{ratio(onWhite)}:1</span> /{' '}
          <span className="font-mono">{ratio(onInk)}:1</span>
        </p>
      </div>
    </li>
  );
}

/** Every brand token with its contrast ratio against white / ink. */
export function ColorTokens() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {(Object.entries(brandColors) as Array<[BrandColor, string]>).map(([name, hex]) => (
        <Swatch key={name} name={name} hex={hex} />
      ))}
    </ul>
  );
}
