#!/usr/bin/env node
/**
 * Election-COS1.0 — repeatable ingest script for IEC/MDB ward demarcation
 * gazettes. IC-ECOS-BUILD-2026-V2 §6.1: "seed wards/VDs from IEC
 * demarcation PDFs via a repeatable ingest script, not a one-off."
 *
 * Input: a Provincial Gazette PDF publishing a Municipal Demarcation
 * Board ward delimitation notice under the Local Government: Municipal
 * Structures Act, 1998 (Act 117 of 1998) Schedule 1 Item 5(1) — the format
 * verified against this session: North West Provincial Gazette Extraordinary
 * Vol 268 No. 8929, 18 November 2025, JB Marks Local Municipality (NW405).
 * Other provinces' gazettes may format their schedule slightly differently
 * — re-verify parser output against the printed totals before trusting a
 * new municipality's output (see the assertions this script itself runs).
 *
 * Requires poppler-utils' `pdftotext` on PATH (not a Node dependency —
 * kept out of the app's own package.json, same rationale as tools/docgen).
 *
 * Usage:
 *   node parse-nw405-demarcation.mjs <path-to-gazette.pdf> <municipalityCode> [output.json]
 *
 * Output: a JSON array of { ward: WardDraft, votingDistricts: VotingDistrictDraft[] }
 * — shapes match src/dal/ports/wards.ts / src/dal/ports/votingDistricts.ts
 * (minus tenantId, which the loader fills in at seed time).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , pdfPath, municipalityCode, outPath] = process.argv;

if (!pdfPath || !municipalityCode) {
  console.error('Usage: node parse-nw405-demarcation.mjs <gazette.pdf> <municipalityCode> [output.json]');
  process.exit(1);
}

function extractText(pdf) {
  const tmpTxt = join(tmpdir(), `nw-demarcation-${Date.now()}.txt`);
  execFileSync('pdftotext', ['-layout', pdf, tmpTxt], { stdio: 'inherit' });
  return readFileSync(tmpTxt, 'utf8');
}

function extractSchedule(fullText) {
  const start = fullText.search(/^\s*SCHEDULE\s*$/m);
  const end = fullText.search(/FORM MDB 5/);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      'Could not find the SCHEDULE...FORM MDB 5 bounds in the extracted text — gazette layout may differ from the verified NW405 format. Inspect the raw pdftotext output before trusting this script for a new source.',
    );
  }
  return fullText.slice(start, end);
}

const WARD_RE = /Ward\s+(\d+)\s+comprises of a total of\s+(\d+)\s+registered voters\./;
// 8-digit IEC VD code, station name, voter count, optional 'Y' split flag.
const VD_RE = /^\s*(\d{8})\s+(.+?)\s+(\d+)(\s+Y)?\s*$/;

function parseSchedule(scheduleText) {
  const wards = [];
  let current = null;
  for (const line of scheduleText.split('\n')) {
    const wardMatch = WARD_RE.exec(line);
    if (wardMatch) {
      if (current) wards.push(current);
      current = { wardNumber: Number(wardMatch[1]), registeredVoters: Number(wardMatch[2]), vds: [] };
      continue;
    }
    const vdMatch = VD_RE.exec(line);
    if (vdMatch && current) {
      current.vds.push({
        vdCode: vdMatch[1],
        name: vdMatch[2].trim(),
        registeredVoters: Number(vdMatch[3]),
        split: Boolean(vdMatch[4]),
      });
    }
  }
  if (current) wards.push(current);
  return wards;
}

function toDraftRecords(wards, muniCode) {
  const records = [];
  for (const w of wards) {
    const wardCode = `${muniCode}-W${w.wardNumber}`;
    const vdCodes = w.vds.map((v) => v.vdCode);
    records.push({
      ward: {
        id: wardCode,
        wardCode,
        municipalityCode: muniCode,
        name: `Ward ${w.wardNumber}`,
        registeredVoters: w.registeredVoters,
        vdCodes,
      },
      votingDistricts: w.vds.map((v) => ({
        id: `${wardCode}::${v.vdCode}`,
        vdCode: v.vdCode,
        wardCode,
        name: v.name,
        registeredVoters: v.registeredVoters,
        // `split` isn't a VotingDistrict field (the port doesn't model it)
        // — kept here only as a seed-time annotation for human review, the
        // loader should drop it before calling dal.votingDistricts.upsert.
        _split: v.split,
      })),
    });
  }
  return records;
}

function assertSanity(records, expectedTotalVoters) {
  const wardCount = records.length;
  const vdCount = records.reduce((s, r) => s + r.votingDistricts.length, 0);
  const sumWardVoters = records.reduce((s, r) => s + r.ward.registeredVoters, 0);
  const sumVdVoters = records.reduce((s, r) => s + r.votingDistricts.reduce((s2, v) => s2 + v.registeredVoters, 0), 0);

  console.error(`Parsed ${wardCount} wards, ${vdCount} VD-ward records.`);
  console.error(`Sum of ward.registeredVoters: ${sumWardVoters}`);
  console.error(`Sum of VD.registeredVoters:   ${sumVdVoters}`);

  if (sumWardVoters !== sumVdVoters) {
    throw new Error(
      `Sanity check failed: ward totals (${sumWardVoters}) don't match VD totals (${sumVdVoters}) — parsing likely missed or double-counted a row. Do not seed this output.`,
    );
  }
  if (expectedTotalVoters && sumWardVoters !== expectedTotalVoters) {
    console.error(
      `WARNING: expected municipal total ${expectedTotalVoters} (from the gazette's own preamble) but parsed ${sumWardVoters}. Verify by hand before seeding.`,
    );
  }
}

const fullText = extractText(pdfPath);
const scheduleText = extractSchedule(fullText);
const wards = parseSchedule(scheduleText);
const records = toDraftRecords(wards, municipalityCode);

// The gazette states its own municipal total in the preamble ("... namely
// 122059 voters in March 2024 ...") — cross-check against it when present.
const preambleMatch = fullText.match(/namely\s+(\d+)\s+voters/);
assertSanity(records, preambleMatch ? Number(preambleMatch[1]) : undefined);

const output = JSON.stringify(records, null, 2);
if (outPath) {
  writeFileSync(outPath, output);
  console.error(`Wrote ${outPath}`);
} else {
  process.stdout.write(output);
}
