/**
 * Election-COS1.0 — voter sentiment display metadata
 * IC-ECOS-BUILD-2026-V2 §6.2. Maps the 5-tier `Voter.sentiment` enum to a
 * label and a tone token, ordered opposition-to-support for use in
 * segmented pickers (matches the reference screens' left-to-right
 * critical → favorable ordering).
 */
import type { Voter } from '@/dal/ports/voters';

export type Sentiment = Voter['sentiment'];

interface SentimentMeta {
  label: string;
  /** One of the design tokens — never a raw hex, per §2.2. */
  tone: 'maroon' | 'gold' | 'slate' | 'teal' | 'green';
}

export const SENTIMENT_ORDER: Sentiment[] = [
  'STRONG_OPPOSITION',
  'LEAN_OPPOSITION',
  'UNDECIDED',
  'LEAN_SUPPORT',
  'STRONG_SUPPORT',
];

export const SENTIMENT_META: Record<Sentiment, SentimentMeta> = {
  STRONG_OPPOSITION: { label: 'Strong Opposition', tone: 'maroon' },
  LEAN_OPPOSITION: { label: 'Lean Opposition', tone: 'slate' },
  UNDECIDED: { label: 'Undecided', tone: 'gold' },
  LEAN_SUPPORT: { label: 'Lean Support', tone: 'teal' },
  STRONG_SUPPORT: { label: 'Strong Support', tone: 'green' },
};
