/**
 * Election Campaign OS — emit the document set to disk
 *
 *   npx vite-node scripts/emit-documents.ts -- --out <dir> --role canvasser
 *
 * Produces a .pdf and a .docx for every document a given reader is
 * handed: the role-filtered operations manual, the three factual notices,
 * and the five drafting packs.
 *
 * A script rather than a test fixture because these files are a
 * deliverable. The application will call `renderDocumentSet()` directly
 * when the download button exists; this is how they are produced in the
 * meantime, and how a reviewer regenerates them after a wording change.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SEED_ROLES } from '@/auth/seedRoles';
import { MODULES } from '@/auth/modules';
import { entitlementId, type TenantEntitlement } from '@/dal/ports/entitlements';
import { renderDocumentSet } from '@/modules/documents/documentSet';

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

const roleId = arg('role', 'canvasser');
const organisation = arg('org', 'Ward 12 Campaign Office — Tlokwe');
const version = arg('version', '1.0');
const outDir = path.resolve(process.cwd(), arg('out', 'dist-documents'));

const role = SEED_ROLES.find((r) => r.id === roleId);
if (!role) {
  console.error(`Unknown role "${roleId}". Known: ${SEED_ROLES.map((r) => r.id).join(', ')}`);
  process.exit(1);
}

/** A fully subscribed tenant, so nothing is withheld for the wrong reason. */
const WARD_CODE = '40405012';
const stamp = '2026-01-01T00:00:00.000Z';
const entitlements: TenantEntitlement[] = MODULES.map((module) => {
  const wardCode = module.scope === 'WARD' ? WARD_CODE : undefined;
  return {
    id: entitlementId(module.key, wardCode),
    tenantId: 'demo',
    module: module.key,
    wardCode,
    activeFrom: stamp,
    activeUntil: '2027-01-01T00:00:00.000Z',
    sourceReference: 'demonstration set',
    createdAt: stamp,
    updatedAt: stamp,
    updatedBy: 'emit-documents',
  };
});

const rendered = renderDocumentSet(
  { roleId: role.id, caps: [...role.defaultCaps], entitlements, wardCode: WARD_CODE, now: new Date('2026-06-01') },
  { organisation, version },
);

mkdirSync(outDir, { recursive: true });
for (const { stem, pdf, docx, doc } of rendered) {
  writeFileSync(path.join(outDir, `${stem}.pdf`), pdf);
  writeFileSync(path.join(outDir, `${stem}.docx`), docx);
  console.log(
    `${doc.meta.reference}  ${doc.title}  [${doc.meta.status}]  ` +
      `${stem}.pdf (${pdf.length} B)  ${stem}.docx (${docx.length} B)`,
  );
}
console.log(`\n${rendered.length * 2} files written to ${outDir}`);
