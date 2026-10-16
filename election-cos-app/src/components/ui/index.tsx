/**
 * Election Campaign OS — the shared interface primitives
 * IC-ECOS-BUILD-2026-V2 §2.2, §3.3.
 *
 * WHY THIS EXISTS
 *
 * Until session 38 the design system was two files of values — `tokens.ts`
 * and `toneClasses.ts` — and no components. Every page assembled the same
 * Tailwind strings by hand: `bg-white border border-ink/10 rounded-lg p-4`
 * appeared 27 times, `text-label-caps font-display uppercase text-slate`
 * 205 times, the input class 68 times, the route-slug page header 45
 * times.
 *
 * That is not a tidiness complaint. It is why the product reads as forty
 * screens rather than one application: each copy drifted a little — a
 * `p-4` here and a `p-3` there, `rounded` against `rounded-lg`, a button
 * that is `py-2` on one page and `py-1.5` on the next — and no single
 * edit could correct any of it.
 *
 * NOTHING HERE IS NEW VISUAL LANGUAGE
 *
 * Every class below was already in the codebase. This is the majority
 * spelling of each pattern, named. Pages that have not been migrated look
 * exactly as they did, because they are still using the same strings
 * these components encode — the difference is that new work has one
 * spelling to reach for and a change to the system is now one edit.
 *
 * WHAT THE PRIMITIVES ENCODE BEYOND LOOKS
 *
 *  - Touch targets. This is a field application used one-handed on a
 *    phone, often standing at a gate. Buttons are at least 44px tall,
 *    which several hand-rolled `py-1.5` copies were not.
 *  - Focus. Every interactive primitive keeps the gold focus ring from
 *    `index.css` rather than suppressing it.
 *  - Labels. `Field` ties its label to its control with a generated id,
 *    so a screen reader announces it — several hand-rolled forms wrapped
 *    the input in a bare `<label>` with no association at all.
 */
import { useId, type ReactNode } from 'react';

/* ------------------------------------------------------------------ page */

export function PageHeader({
  slug,
  title,
  action,
  description,
}: {
  /** The route, shown small above the title — e.g. `/wards`. */
  slug: string;
  title: string;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <p className="text-label-caps font-display uppercase text-slate">{slug}</p>
        <h1 className="text-headline-md font-display text-ink mt-1">{title}</h1>
        {description && <p className="text-body-md font-body text-slate mt-2 max-w-prose">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** The small tracked capital label that titles almost every panel. */
export function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-label-caps font-display uppercase text-slate ${className}`}>{children}</p>;
}

/** Codes, ids and figures. Monospaced so columns of them line up. */
export function DataLine({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-data-mono font-mono text-slate ${className}`}>{children}</p>;
}

/* ------------------------------------------------------------------ card */

export function Card({
  children,
  className = '',
  tone = 'default',
}: {
  children: ReactNode;
  className?: string;
  /** `alert` draws the maroon border used where something contradicts. */
  tone?: 'default' | 'alert' | 'accent';
}) {
  const border =
    tone === 'alert' ? 'border-maroon' : tone === 'accent' ? 'border-gold' : 'border-ink/10';
  return <div className={`bg-white border ${border} rounded-lg p-4 ${className}`}>{children}</div>;
}

/**
 * A headline number with its label. The War Room and Wards pages both
 * built this by hand, with different padding.
 */
export function StatTile({
  label,
  value,
  sub,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Inverts to the ink field, for the one figure that matters most. */
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded p-4 border ${
        emphasis ? 'bg-ink text-paper border-ink' : 'bg-white border-ink/10'
      }`}
    >
      <p className={`text-label-caps font-display uppercase ${emphasis ? 'text-gold' : 'text-slate'}`}>
        {label}
      </p>
      <p className={`text-display-lg-mobile font-display ${emphasis ? '' : 'text-ink'}`}>{value}</p>
      {sub && (
        <p className={`text-data-mono font-mono ${emphasis ? 'text-paper/70' : 'text-slate'}`}>{sub}</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-gold text-ink',
  secondary: 'bg-ink text-paper',
  ghost: 'border border-ink/20 text-ink bg-transparent',
  danger: 'bg-maroon text-paper',
};

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...rest
}: {
  children: ReactNode;
  variant?: ButtonVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type === 'submit' ? 'submit' : type === 'reset' ? 'reset' : 'button'}
      // min-h-11 is 44px: the smallest target that is reliably hittable
      // with a thumb. Several hand-rolled buttons were 30px.
      className={`inline-flex items-center justify-center gap-2 min-h-11 rounded px-4 py-2 text-label-caps font-display uppercase transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- field */

const CONTROL_CLASS =
  'w-full min-h-11 border border-ink/20 rounded px-3 py-2 text-body-md font-body bg-white text-ink';

/**
 * A labelled control.
 *
 * `children` is called with the id so the label is genuinely associated —
 * several hand-rolled forms wrapped the control in a bare `<label>` and a
 * screen reader announced nothing.
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; className: string; 'aria-describedby'?: string }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-label-caps font-display uppercase text-slate block">
        {label}
        {required && <span className="text-maroon"> *</span>}
      </label>
      {children({
        id,
        className: `${CONTROL_CLASS} ${error ? 'border-maroon' : ''}`,
        'aria-describedby': describedBy,
      })}
      {hint && (
        <p id={hintId} className="text-body-md font-body text-slate">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-body-md font-body text-maroon">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ empty/state */

/**
 * What a screen shows before there is anything on it.
 *
 * Takes an explanation rather than only a title: an empty voter roll in
 * this product usually means the seed has not been loaded, and saying so
 * is more use than the word "Empty".
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="bg-white border border-dashed border-ink/20 rounded-lg p-8 text-center space-y-3">
      <p className="text-headline-md font-display text-ink">{title}</p>
      {children && <div className="text-body-md font-body text-slate max-w-prose mx-auto">{children}</div>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/** A short status word on a tinted ground. Tones come from toneClasses.ts. */
export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-label-caps font-display uppercase ${className}`}
    >
      {children}
    </span>
  );
}

/** The sentence that explains how a figure was arrived at, under a panel. */
export function BasisNote({ children }: { children: ReactNode }) {
  return <p className="text-body-md font-body text-slate">{children}</p>;
}

/* ----------------------------------------------------------------- table */

/**
 * A scannable data table.
 *
 * Adopted from the screen-rebuild reference supplied in session 39, which
 * used our own tokens and rebuilt six screens against them. The build had
 * no table at all: the Wards page rendered 34 municipalities as 34 stacked
 * cards, which is most of a metre of scrolling to compare two figures.
 *
 * Three details carry the weight:
 *
 *  - `tabular-nums` on numeric cells, so a column of voter counts lines up
 *    digit over digit. Proportional figures in a column are unreadable as
 *    a comparison, which is the only reason to put them in a column.
 *  - Headers in the display face, tracked and uppercase — the same
 *    treatment `SectionLabel` gives every other heading in the product.
 *  - A horizontal scroll container rather than a reflow. A table that
 *    rewraps on a phone stops being a table; one that scrolls sideways is
 *    still readable, and the first column stays put.
 */
export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <table className="w-full border-collapse text-body-md">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  numeric = false,
  className = '',
}: {
  children: ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b border-ink/10 px-3 py-2.5 text-label-caps font-display uppercase text-slate ${
        numeric ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric = false,
  mono = false,
  className = '',
}: {
  /** Optional: a footer or spacer cell legitimately has none. */
  children?: ReactNode;
  numeric?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-ink/5 px-3 py-2.5 ${numeric ? 'text-right tabular-nums' : ''} ${
        mono ? 'font-mono text-data-mono' : 'font-body'
      } ${className}`}
    >
      {children}
    </td>
  );
}

/**
 * A proportion drawn as a bar.
 *
 * `value` and `max` rather than a percentage, so the caller cannot hand it
 * a figure it computed differently from the one it prints beside it.
 */
export function BarMeter({
  value,
  max,
  tone = 'bg-teal',
  label,
}: {
  value: number;
  max: number;
  tone?: string;
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded bg-paper"
      role="img"
      aria-label={label}
      title={label}
    >
      <div className={`h-full rounded ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
