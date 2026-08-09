/**
 * Election-COS1.0 — field diary activity-type display metadata
 * IC-ECOS-BUILD-2026-V2 §6.3. See src/dal/ports/diary.ts for why
 * `activityType` exists (session 9, real Stitch reference).
 */
import type { DiaryActivityType } from '@/dal/ports/diary';
import type { Tone } from '@/design/toneClasses';

export const ACTIVITY_ORDER: DiaryActivityType[] = ['CANVASS', 'RALLY', 'OBSERVATION', 'OTHER'];

export const ACTIVITY_META: Record<DiaryActivityType, { label: string; tone: Tone }> = {
  CANVASS: { label: 'Canvass', tone: 'teal' },
  RALLY: { label: 'Rally', tone: 'gold' },
  OBSERVATION: { label: 'Observation', tone: 'slate' },
  OTHER: { label: 'Other', tone: 'slate' },
};
