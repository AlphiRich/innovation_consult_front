/**
 * Election Campaign OS — file store port (Cloud Storage)
 * IC-ECOS-BUILD-2026-V2 §5.1, §6.4.
 *
 * §6.4 keeps binary content — incident photographs, generated referral
 * PDFs — in object storage and references it from Firestore by path,
 * never inlined. Until now nothing in the DAL could actually write there:
 * `IncidentRepository.markReferred()` has taken a `referralPdfPath` since
 * Phase 3 with no port able to produce one. This is that port.
 *
 * Like every other port it takes `SessionContext` first (§5.2,
 * non-negotiable #1) — here it also lets the adapter refuse a path outside
 * the caller's own tenant before a byte leaves the device, ahead of
 * storage.rules doing the same thing authoritatively.
 */
import type { SessionContext } from './session';

export interface StoredFile {
  /** Full object path, e.g. `tenants/{tid}/referrals/{id}/referral-<hash>.pdf`. */
  path: string;
  /** Time-limited URL for retrieving the object. */
  downloadUrl: string;
  sizeBytes: number;
}

export interface FileStoreRepository {
  upload(
    ctx: SessionContext,
    path: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<StoredFile>;
  getDownloadUrl(ctx: SessionContext, path: string): Promise<string>;
}

/**
 * Every object this product writes lives under `tenants/{tenantId}/`.
 * Exported so the adapter and its tests share one definition of what a
 * legal path looks like.
 */
export function isPathWithinTenant(tenantId: string, path: string): boolean {
  return path.startsWith(`tenants/${tenantId}/`) && !path.includes('..');
}
