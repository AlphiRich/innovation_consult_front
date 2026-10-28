#!/usr/bin/env node
/**
 * Election Campaign OS — load the NW405 seed into the local emulator
 * IC-ECOS-BUILD-2026-V2 §6.1.
 *
 * `tools/seed-data/load-seed-wards.mjs` does this against a real project
 * via firebase-admin, and has never been run because no project has ever
 * been reachable. This is the emulator equivalent: plain REST against the
 * Firestore emulator, no credentials, no admin SDK.
 *
 * It loads the real delimitation — 34 wards and 135 ward-scoped voting
 * district records parsed from the North West provincial delimitation
 * notice, summing to 122,059 registered voters — plus the municipality
 * profile taken from the proclaimed baseline. Those specific figures
 * matter: they are what makes the Wards page's cross-check against the
 * proclaimed delimitation actually pass, so a developer sees the real
 * behaviour rather than an empty state.
 *
 * LOOPBACK ONLY
 *
 * Like `grant-claims.mjs`, the host is not a parameter. Pointed at a real
 * project this would write 170 documents into a tenant with no
 * authentication at all.
 *
 * USAGE
 *   node tools/dev/seed-emulator.mjs [tenantId]
 */
import process from 'node:process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const HOST = '127.0.0.1';
const PORT = JSON.parse(readFileSync(path.join(ROOT, 'firebase.json'), 'utf8')).emulators.firestore.port;
const PROJECT = process.env.ECOS_EMULATOR_PROJECT ?? 'demo-ecos';
const TENANT = process.argv[2] ?? 'demo-tenant';
const BASE = `http://${HOST}:${PORT}/v1/projects/${PROJECT}/databases/(default)/documents`;

const NOW = new Date().toISOString();

/** Firestore REST wants every value tagged with its type. */
function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
  }
  return { stringValue: String(value) };
}

async function write(docPath, fields) {
  const response = await fetch(`${BASE}/${docPath}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, encode(v)])) }),
  });
  if (!response.ok) throw new Error(`${docPath} -> ${response.status} ${(await response.text()).slice(0, 200)}`);
}

const seed = JSON.parse(readFileSync(path.join(ROOT, 'seed-data', 'jb-marks-nw405-wards-vds.json'), 'utf8'));

const stamps = { createdAt: NOW, updatedAt: NOW, updatedBy: 'seed-emulator', deletedAt: null, schemaVersion: 1 };

try {
  // Municipality profile, from the proclaimed delimitation (Annexure A to
  // IEC Circular 1 of 2025). 67 council seats = 34 ward + 33 PR.
  await write(`tenants/${TENANT}/profile/municipality`, {
    id: 'municipality',
    tenantId: TENANT,
    municipalityCode: 'NW405',
    municipalityName: 'JB Marks',
    province: 'North West',
    totalCouncilSeats: 67,
    wardSeats: 34,
    prSeats: 33,
    electionDate: '2026-11-04T00:00:00.000Z',
    createdAt: NOW,
    updatedAt: NOW,
    updatedBy: 'seed-emulator',
  });

  let wards = 0;
  let vds = 0;
  let voters = 0;

  for (const entry of seed) {
    const ward = entry.ward;
    await write(`tenants/${TENANT}/wards/${ward.wardCode}`, {
      id: ward.wardCode,
      tenantId: TENANT,
      wardCode: ward.wardCode,
      municipalityCode: ward.municipalityCode,
      name: ward.name,
      registeredVoters: ward.registeredVoters,
      vdCodes: ward.vdCodes,
      ...stamps,
    });
    wards += 1;
    voters += ward.registeredVoters;

    for (const vd of entry.votingDistricts) {
      // `${wardCode}::${vdCode}` — a split station appears once per ward
      // it falls in, which is why 108 stations produce 135 records.
      // 135 records, 135 ids: a repeated id would be written twice here
      // and only the last would survive, which is what used to happen.
      // `wardSizeDeviation.test.ts` holds that, since this loop cannot.
      await write(`tenants/${TENANT}/votingDistricts/${vd.id.replace(/\//g, '_')}`, {
        id: vd.id,
        tenantId: TENANT,
        vdCode: vd.vdCode,
        wardCode: vd.wardCode,
        name: vd.name,
        registeredVoters: vd.registeredVoters,
        ...stamps,
      });
      vds += 1;
    }
  }

  console.log(`Seeded tenant ${TENANT}: ${wards} wards, ${vds} voting-district records, ${voters.toLocaleString('en-ZA')} registered voters.`);
  console.log('The Wards page should now read 34 / 34 and "Proclaimed delimitation · aligned".');
} catch (error) {
  console.error(`Failed: ${error.message}\n\nIs the Firestore emulator running? Start it with: npm run emulators`);
  process.exit(1);
}
