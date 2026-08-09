/**
 * Election-COS1.0 — incident display metadata
 * IC-ECOS-BUILD-2026-V2 §6.4. Fixed taxonomy only — never free text (the
 * category/severity enums are the whole point: firestore.rules rejects a
 * create whose category isn't one of these four).
 */
import type { IncidentCategory, IncidentSeverity, IncidentStatus } from '@/dal/ports/incidents';
import type { Tone } from '@/design/toneClasses';

export const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  WATER_SANITATION: 'Water & Sanitation',
  ELECTRICITY: 'Electricity',
  ROADS_TRANSPORT: 'Roads & Transport',
  PUBLIC_SAFETY: 'Public Safety',
};

export const SEVERITY_ORDER: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const SEVERITY_META: Record<IncidentSeverity, { label: string; tone: Tone }> = {
  LOW: { label: 'Low', tone: 'slate' },
  MEDIUM: { label: 'Medium', tone: 'teal' },
  HIGH: { label: 'High', tone: 'gold' },
  CRITICAL: { label: 'Critical', tone: 'maroon' },
};

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  LOGGED: 'Logged',
  TRIAGED: 'Triaged',
  ESCALATED: 'Escalated',
  REFERRED: 'Referred',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

/** The workflow's forward order (§6.4). Used to drive the status tab list. */
export const STATUS_ORDER: IncidentStatus[] = ['LOGGED', 'TRIAGED', 'ESCALATED', 'REFERRED', 'RESOLVED', 'CLOSED'];
