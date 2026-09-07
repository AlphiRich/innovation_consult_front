/**
 * Election Campaign OS — static Tailwind class lookup for design-token tones
 *
 * Tailwind's content scanner only picks up class names that appear as
 * complete literal strings in source — `` `bg-${tone}` `` template
 * interpolation would silently produce no CSS in the production build.
 * This lookup exists so every class name is written out in full at least
 * once, keyed by the same tone token names used across modules (originally
 * built for voters/sentiment.ts's SENTIMENT_META, moved here in session 9
 * so incidents/severityMeta.ts and any future module can share it instead
 * of re-deriving the same five class strings).
 */
export type Tone = 'maroon' | 'gold' | 'slate' | 'teal' | 'green';

export const TONE_ACTIVE_CLASSES: Record<Tone, string> = {
  maroon: 'bg-maroon text-white border-maroon',
  gold: 'bg-gold text-white border-gold',
  slate: 'bg-slate text-white border-slate',
  teal: 'bg-teal text-white border-teal',
  green: 'bg-green text-white border-green',
};

/** Lighter pill treatment — badges on a list/card, not the active picker state. */
export const TONE_PILL_CLASSES: Record<Tone, string> = {
  maroon: 'bg-maroon/10 text-maroon border-maroon/30',
  gold: 'bg-gold/10 text-gold border-gold/30',
  slate: 'bg-slate/10 text-slate border-slate/30',
  teal: 'bg-teal/10 text-teal border-teal/30',
  green: 'bg-green/10 text-green border-green/30',
};
