/**
 * Election-COS1.0 — Firestore adapter shared helpers
 * IC-ECOS-BUILD-2026-V2 §5.2, §5.3
 *
 * Every tenant collection lives at /tenants/{tenantId}/{collection} (§4.1),
 * every document carries the same base fields (§5.3), and every read is
 * narrowed by SessionContext.geoScope the same way the security rules do
 * (§4.2 inScope) — client-side narrowing here is a UX/query-shape
 * convenience, the security rules are the actual enforcement layer.
 *
 * This factory exists so port adapters don't each hand-roll the same
 * Firestore plumbing; it does NOT replace the one-port-interface-per-module
 * discipline in §5.1 — each collection still gets its own port file and its
 * own thin adapter file that composes this.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  where,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';
import { getDb } from './client';
import type { GeoScope, Page, PageRequest, SessionContext, UpsertResult } from '@/dal/ports/session';

export const DEFAULT_PAGE_SIZE = 25; // §7.4 free-tier discipline

export function tenantCollectionPath(tenantId: string, collectionName: string): string {
  return `tenants/${tenantId}/${collectionName}`;
}

export function db(): Firestore {
  return getDb();
}

/**
 * Geographic narrowing that mirrors firestore.rules `inScope()` (§4.2).
 * Client-side; the rules are what actually enforces this.
 */
export function geoScopeConstraints(
  ctx: SessionContext,
  wardField = 'wardCode',
  vdField = 'vdCode',
): QueryConstraint[] {
  switch (ctx.geoScope as GeoScope) {
    case 'WARD':
      return ctx.wardScope ? [where(wardField, '==', ctx.wardScope)] : [];
    case 'VD':
      return ctx.vdScope ? [where(vdField, '==', ctx.vdScope)] : [];
    case 'TENANT':
    case 'MUNICIPALITY':
    default:
      return [];
  }
}

export function toISO(value: Timestamp | string | undefined | null): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}

export function stampOnWrite(ctx: SessionContext, isCreate: boolean) {
  return {
    tenantId: ctx.tenantId,
    updatedAt: serverTimestamp(),
    updatedBy: ctx.uid,
    ...(isCreate ? { createdAt: serverTimestamp(), deletedAt: null, schemaVersion: 1 } : {}),
  };
}

// Unconstrained on purpose: some domain types (Donor, Donation — §6.8.2)
// don't carry the full BaseDocument shape (no deletedAt/schemaVersion),
// and this helper doesn't touch those fields itself — only `fromFirestore`
// needs to know the real shape.
export async function getByIdGeneric<T>(
  ctx: SessionContext,
  collectionName: string,
  id: string,
  fromFirestore: (id: string, data: Record<string, unknown>) => T,
): Promise<T | null> {
  const ref = doc(db(), tenantCollectionPath(ctx.tenantId, collectionName), id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return fromFirestore(snap.id, snap.data());
}

export async function listPageGeneric<T>(
  ctx: SessionContext,
  collectionName: string,
  extraConstraints: QueryConstraint[],
  page: PageRequest,
  fromFirestore: (id: string, data: Record<string, unknown>) => T,
): Promise<Page<T>> {
  const pageSize = page.pageSize ?? DEFAULT_PAGE_SIZE;
  const constraints: QueryConstraint[] = [
    ...extraConstraints,
    orderBy('updatedAt', 'desc'),
    fbLimit(pageSize),
  ];
  // NOTE: cursor resolution (mapping page.cursor -> a DocumentSnapshot for
  // startAfter) requires a snapshot cache keyed by cursor id; deferred to
  // Phase 3 implementation alongside the first real consumer, per §5.2
  // "write the port interface and its test suite before the adapter".
  void startAfter;
  const q = query(collection(db(), tenantCollectionPath(ctx.tenantId, collectionName)), ...constraints);
  const snap = await getDocs(q);
  return {
    items: snap.docs.map((d) => fromFirestore(d.id, d.data())),
    nextCursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1].id : undefined,
  };
}

export async function upsertGeneric(
  ctx: SessionContext,
  collectionName: string,
  id: string,
  data: object,
  isCreate: boolean,
): Promise<UpsertResult> {
  const ref = doc(db(), tenantCollectionPath(ctx.tenantId, collectionName), id);
  await setDoc(ref, { ...data, ...stampOnWrite(ctx, isCreate) }, { merge: true });
  // Optimistic: serverTimestamp() is a write-time sentinel with no value
  // available client-side until the next read. Callers that need the
  // authoritative value should re-read; this is good enough for "did the
  // write succeed" callers (§5.1 UpsertResult contract).
  return { id, updatedAt: new Date().toISOString() };
}
