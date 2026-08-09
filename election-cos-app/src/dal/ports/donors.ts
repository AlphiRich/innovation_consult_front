/**
 * Election-COS1.0 — Donor repository port (PPFA)
 * IC-ECOS-BUILD-2026-V2 §6.8.2. Online only — never in the offline layer
 * (§7.1). idNumber/registrationNumber are special personal information —
 * never plaintext.
 */
import type { SessionContext, UpsertResult } from './session';

export type DonorType = 'NATURAL_PERSON' | 'JURISTIC_PERSON' | 'FOREIGN' | 'ANONYMOUS';

export interface Donor {
  id: string;
  tenantId: string;
  donorType: DonorType;
  displayName: string;
  idNumberEncrypted?: string;
  registrationNumberEncrypted?: string;
  contactEmail?: string;
  isForeign: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type DonorDraft = Omit<Donor, 'createdAt' | 'updatedAt' | 'updatedBy'>;

export interface DonorRepository {
  getById(ctx: SessionContext, id: string): Promise<Donor | null>;
  listAll(ctx: SessionContext): Promise<Donor[]>;
  upsert(ctx: SessionContext, donor: DonorDraft): Promise<UpsertResult>;
}
