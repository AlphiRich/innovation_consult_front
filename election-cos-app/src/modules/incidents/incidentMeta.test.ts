import { describe, expect, it } from 'vitest';
import type { IncidentCategory, IncidentStatus } from '@/dal/ports/incidents';
import { CATEGORY_LABEL, SEVERITY_META, SEVERITY_ORDER, STATUS_LABEL, STATUS_ORDER } from './incidentMeta';

const ALL_CATEGORIES: IncidentCategory[] = ['WATER_SANITATION', 'ELECTRICITY', 'ROADS_TRANSPORT', 'PUBLIC_SAFETY'];
const ALL_STATUSES: IncidentStatus[] = ['LOGGED', 'TRIAGED', 'ESCALATED', 'REFERRED', 'RESOLVED', 'CLOSED'];

describe('incident metadata', () => {
  it('has a label for every category in the fixed taxonomy, one-to-one', () => {
    expect(Object.keys(CATEGORY_LABEL).sort()).toEqual([...ALL_CATEGORIES].sort());
  });

  it('has an order entry and a meta entry for every severity, one-to-one', () => {
    expect(SEVERITY_ORDER).toHaveLength(4);
    expect(new Set(SEVERITY_ORDER).size).toBe(4);
    for (const key of SEVERITY_ORDER) {
      expect(SEVERITY_META[key]).toBeDefined();
    }
  });

  it('orders severity low to critical, matching an ascending-urgency reading', () => {
    expect(SEVERITY_ORDER).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  });

  it('uses only design-token tone names, never raw colours', () => {
    const validTones = ['maroon', 'gold', 'slate', 'teal', 'green'];
    for (const meta of Object.values(SEVERITY_META)) {
      expect(validTones).toContain(meta.tone);
    }
  });

  it('has a label and an order entry for every workflow status (§6.4), one-to-one', () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual([...ALL_STATUSES].sort());
    expect(STATUS_ORDER).toHaveLength(6);
    expect(new Set(STATUS_ORDER).size).toBe(6);
  });

  it('orders status by the workflow forward direction (§6.4)', () => {
    expect(STATUS_ORDER).toEqual(['LOGGED', 'TRIAGED', 'ESCALATED', 'REFERRED', 'RESOLVED', 'CLOSED']);
  });
});
