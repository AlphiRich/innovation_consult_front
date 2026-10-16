/**
 * Election Campaign OS — generic module placeholder
 * IC-ECOS-BUILD-2026-V2 §3.4, §3.4.5.
 *
 * Renders where a module's real screen would go. Used because no Stitch
 * screen assets were available in this build session (only the two spec
 * markdowns — see BUILD-STATUS.md "What's blocked"). This keeps the IA and
 * routing real and testable now, without inventing screen content that
 * would have to be thrown away once the ~170 Stitch PNGs are re-supplied
 * (master index §7 — "Not reviewed all ~170 screens").
 *
 * Session 44: was the last place in the build still using Tailwind's
 * default type scale (`text-xs`, `text-2xl`, `text-sm`) instead of the
 * product's own tokens, which is why its body copy rendered at 14px where
 * every real screen uses 16px. `scripts/check-type-scale.mjs` now fails
 * the build on that class of drift the way `check-no-hex.mjs` does for
 * colour.
 */
import { Card, PageHeader } from '@/components/ui';
interface PagePlaceholderProps {
  title: string;
  route: string;
  status: 'stub' | 'partial' | 'held';
  note?: string;
}

const STATUS_LABEL: Record<PagePlaceholderProps['status'], string> = {
  stub: 'Route + capability gate wired. Screen content pending Stitch asset re-extraction.',
  partial: 'Partially implemented this session.',
  held: 'Deliberately held — see note.',
};

export function PagePlaceholder({ title, route, status, note }: PagePlaceholderProps) {
  return (
    <Card>
      <PageHeader slug={route} title={title} />
      <p className="mt-3 text-body-md font-body text-slate">{STATUS_LABEL[status]}</p>
      {note && <p className="mt-2 text-body-md font-body text-maroon">{note}</p>}
    </Card>
  );
}
