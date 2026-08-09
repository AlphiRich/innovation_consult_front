#!/usr/bin/env node
/**
 * Election-COS1.0 — loads parse-nw405-demarcation.mjs's output into a live
 * tenant's Firestore. IC-ECOS-BUILD-2026-V2 §6.1.
 *
 * **Not run end-to-end in any build session** — no live Firebase project
 * exists yet (BUILD-STATUS.md blocker #2). Written and reviewed for
 * correctness against the Ward/VotingDistrict port shapes, but the actual
 * Firestore write path is unverified until a real project + service
 * account exist. Disclosed rather than silently claimed as tested — same
 * standard as the rest of this build.
 *
 * Uses firebase-admin directly (not the app's client-SDK DAL) — this is a
 * one-off Node/admin operation, the same category as Cloud Functions, not
 * a browser session with a SessionContext.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *   node load-seed-wards.mjs <seed.json> <tenantId>
 */
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [, , seedPath, tenantId] = process.argv;

if (!seedPath || !tenantId) {
  console.error('Usage: GOOGLE_APPLICATION_CREDENTIALS=... node load-seed-wards.mjs <seed.json> <tenantId>');
  process.exit(1);
}

const records = JSON.parse(readFileSync(seedPath, 'utf8'));

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

function stamp(uid) {
  return {
    tenantId,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    deletedAt: null,
    schemaVersion: 1,
  };
}

async function main() {
  const uid = 'seed-script'; // audit trail marker, not a real staff uid
  let wardCount = 0;
  let vdCount = 0;

  for (const record of records) {
    const wardRef = db.doc(`tenants/${tenantId}/wards/${record.ward.id}`);
    await wardRef.set({ ...record.ward, ...stamp(uid) }, { merge: true });
    wardCount += 1;

    for (const vd of record.votingDistricts) {
      // eslint-disable-next-line no-unused-vars
      const { _split, ...vdFields } = vd; // _split is a seed-time annotation, not a VotingDistrict field
      const vdRef = db.doc(`tenants/${tenantId}/votingDistricts/${vd.id}`);
      await vdRef.set({ ...vdFields, ...stamp(uid) }, { merge: true });
      vdCount += 1;
    }
  }

  console.log(`Seeded ${wardCount} wards and ${vdCount} voting-district records into tenant ${tenantId}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
