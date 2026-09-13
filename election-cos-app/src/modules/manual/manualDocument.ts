/**
 * Election Campaign OS — the assembled manual as a printable document
 *
 * `assembleManual()` decides *what* a reader gets; this decides how it
 * reads on a page. One conversion, two output formats — see
 * `src/lib/document/model.ts` for why that matters.
 */
import type { Block, PrintDocument } from '@/lib/document/model';
import { AREA_LABEL, groupByArea, type Manual } from './manualModel';
import { PLANNED_SOPS } from './sops';

export const MANUAL_STATUS_NOTE =
  'This is an operating manual. It describes how the platform works and how it is meant to be used. ' +
  'It is not a contract, a licence or a privacy notice, and it does not vary any agreement between ' +
  'you and Innovation Consult (Pty) Ltd. Where this manual and a signed agreement differ, the ' +
  'agreement governs.';

export interface ManualDocumentMeta {
  organisation: string;
  version: string;
}

export function manualToDocument(manual: Manual, meta: ManualDocumentMeta): PrintDocument {
  const blocks: Block[] = [];

  blocks.push({ kind: 'callout', text: MANUAL_STATUS_NOTE });

  // --- contents -------------------------------------------------------
  blocks.push({ kind: 'heading', level: 1, text: 'Contents' });
  for (const group of groupByArea(manual)) {
    blocks.push({ kind: 'heading', level: 3, text: AREA_LABEL[group.area] });
    blocks.push({ kind: 'bullets', items: group.sops.map((s) => `${s.number} — ${s.title}`) });
  }

  if (manual.withheld.length > 0) {
    blocks.push({ kind: 'heading', level: 3, text: 'Not included in this copy' });
    blocks.push({
      kind: 'para',
      muted: true,
      text: 'These procedures exist but are not part of your copy. They are listed so that nothing is silently missing.',
    });
    blocks.push({
      kind: 'bullets',
      items: manual.withheld.map((w) => `${w.number} — ${w.title}. ${w.reason}`),
    });
  }

  // --- body -----------------------------------------------------------
  for (const group of groupByArea(manual)) {
    blocks.push({ kind: 'pageBreak' });
    blocks.push({ kind: 'heading', level: 1, text: AREA_LABEL[group.area] });
    blocks.push({ kind: 'rule' });

    for (const sop of group.sops) {
      blocks.push({ kind: 'heading', level: 2, text: `${sop.number} · ${sop.title}` });
      blocks.push({ kind: 'para', muted: true, text: sop.purpose });

      for (const section of sop.sections) {
        blocks.push({ kind: 'heading', level: 3, text: section.heading });
        for (const body of section.body ?? []) blocks.push({ kind: 'para', text: body });
        if (section.steps?.length) blocks.push({ kind: 'steps', items: section.steps });
        for (const warning of section.warnings ?? []) blocks.push({ kind: 'callout', text: warning });
      }
    }
  }

  // --- appendix -------------------------------------------------------
  blocks.push({ kind: 'pageBreak' });
  blocks.push({ kind: 'heading', level: 1, text: 'Appendix · The full manual' });
  blocks.push({
    kind: 'para',
    muted: true,
    text:
      'The complete manual is structured as the procedures below. Those not yet issued are listed so ' +
      'the shape of the whole is visible; they are not included here because an empty heading is ' +
      'worse than an acknowledged gap.',
  });
  blocks.push({
    kind: 'bullets',
    items: PLANNED_SOPS.map((p) => `${p.number} — ${p.title} (${AREA_LABEL[p.area]}) · not yet issued`),
  });

  return {
    title: 'Onboarding & Operations Manual',
    subtitle: 'Standard operating procedures by area, role and application function',
    meta: {
      organisation: meta.organisation,
      version: meta.version,
      audience: `${manual.roleLabel} copy`,
      status: 'ISSUED',
      reference: 'IC-ECOS-MAN-2026',
    },
    blocks,
  };
}
