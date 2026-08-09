/**
 * Election-COS1.0 — logistics display metadata
 * IC-ECOS-BUILD-2026-V2 §6.5.
 */
import type { LogisticsItem, LogisticsUrgency } from '@/dal/ports/logistics';
import type { Tone } from '@/design/toneClasses';

export const URGENCY_ORDER: LogisticsUrgency[] = ['ROUTINE', 'URGENT', 'IMMEDIATE'];

export const URGENCY_META: Record<LogisticsUrgency, { label: string; tone: Tone }> = {
  ROUTINE: { label: 'Routine (2–3 days)', tone: 'slate' },
  URGENT: { label: 'Urgent (24h)', tone: 'gold' },
  IMMEDIATE: { label: 'Immediate (GOTV)', tone: 'maroon' },
};

export const STATUS_LABEL: Record<LogisticsItem['status'], string> = {
  AVAILABLE: 'Available',
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  DISPATCHED: 'Dispatched',
  DEPLETED: 'Depleted',
};

export const STATUS_ORDER: LogisticsItem['status'][] = [
  'REQUESTED',
  'APPROVED',
  'DISPATCHED',
  'AVAILABLE',
  'DEPLETED',
];
