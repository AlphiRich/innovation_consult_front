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
 */
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
    <div className="rounded-lg border border-slate/30 bg-white p-6">
      <p className="font-mono text-xs text-slate">{route}</p>
      <h1 className="font-display text-2xl text-ink mt-1">{title}</h1>
      <p className="mt-3 text-sm text-slate">{STATUS_LABEL[status]}</p>
      {note && <p className="mt-2 text-sm text-maroon">{note}</p>}
    </div>
  );
}
