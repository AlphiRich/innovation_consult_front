import { describe, expect, it } from 'vitest';
import { totalsFor, defaultMunicipalityCode , byWardCode, compareWardCodes } from './wardStats';
import type { Ward } from '@/dal/ports/wards';

function ward(overrides: Partial<Ward>): Ward {
  return {
    id: 'w1',
    tenantId: 't1',
    wardCode: 'NW405-W01',
    municipalityCode: 'NW405',
    name: 'Ward 1',
    registeredVoters: 0,
    vdCodes: [],
    createdAt: '',
    updatedAt: '',
    updatedBy: '',
    deletedAt: null,
    schemaVersion: 1,
    ...overrides,
  };
}

describe('totalsFor', () => {
  it('is all zero for an empty list', () => {
    expect(totalsFor([])).toEqual({ wardCount: 0, vdCount: 0, registeredVoters: 0 });
  });

  it('sums registered voters and VD counts across wards', () => {
    const wards = [
      ward({ registeredVoters: 2482, vdCodes: ['86700012', '86700034'] }),
      ward({ wardCode: 'NW405-W02', registeredVoters: 3890, vdCodes: ['86700142'] }),
    ];
    expect(totalsFor(wards)).toEqual({ wardCount: 2, vdCount: 3, registeredVoters: 6372 });
  });
});

describe('defaultMunicipalityCode', () => {
  it('is empty for no wards', () => {
    expect(defaultMunicipalityCode([])).toBe('');
  });

  it('uses the first ward’s municipality code', () => {
    expect(defaultMunicipalityCode([ward({ municipalityCode: 'NW405' })])).toBe('NW405');
  });
});

describe('ward ordering', () => {
  it('sorts the way a person reads, not the way Firestore returns ids', () => {
    // The defect this exists for: lexicographic order puts W10 after W1
    // and W2 after W19, on a list that looks sorted.
    const codes = ['NW405-W10', 'NW405-W2', 'NW405-W1', 'NW405-W34', 'NW405-W3'];
    expect([...codes].sort(compareWardCodes)).toEqual([
      'NW405-W1',
      'NW405-W2',
      'NW405-W3',
      'NW405-W10',
      'NW405-W34',
    ]);
  });

  it('keeps different municipalities grouped', () => {
    expect(['NW404-W2', 'NW405-W1', 'NW404-W10'].sort(compareWardCodes)).toEqual([
      'NW404-W2',
      'NW404-W10',
      'NW405-W1',
    ]);
  });

  it('falls back to plain comparison for codes with no trailing number', () => {
    expect(['BUF', 'CPT'].sort(compareWardCodes)).toEqual(['BUF', 'CPT']);
  });

  it('orders whole ward records', () => {
    const wards = [{ wardCode: 'NW405-W10' }, { wardCode: 'NW405-W2' }];
    expect(byWardCode(wards).map((w) => w.wardCode)).toEqual(['NW405-W2', 'NW405-W10']);
  });
});
