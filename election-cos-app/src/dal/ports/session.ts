/**
 * Election-COS1.0 — DAL shared types
 * IC-ECOS-BUILD-2026-V2 §5.1
 *
 * SessionContext is the one thing every port method takes as its first
 * argument (§5.2, non-negotiable #1). It is derived server-side from the
 * verified ID token's custom claims (§4.4) — never from caller-supplied
 * input — so a component cannot forge access to another tenant or ward.
 */
import type { Capability } from '@/auth/types';

export type GeoScope = 'TENANT' | 'MUNICIPALITY' | 'WARD' | 'VD';

export interface SessionContext {
  tenantId: string;
  uid: string;
  caps: Capability[];
  geoScope: GeoScope;
  wardScope?: string;
  vdScope?: string;
}

export interface PageRequest {
  pageSize: number; // default 25, see §7.4
  cursor?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

/** Fields every tenant document carries, per §5.3. */
export interface BaseDocument {
  id: string;
  tenantId: string;
  createdAt: string; // ISO 8601 — domain model uses strings; adapters convert
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  schemaVersion: number;
}

export interface UpsertResult {
  id: string;
  updatedAt: string;
}
