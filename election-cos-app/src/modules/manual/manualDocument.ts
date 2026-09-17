/**
 * Election Campaign OS — the assembled manual as a printable document
 *
 * `assembleManual()` decides *what* a reader gets; this decides how it
 * reads on a page. One conversion, two output formats — see
 * `src/lib/document/model.ts` for why that matters.
 */
import type { Block, PrintDocument } from '@/lib/document/model';
import { AREA_LABEL, groupByArea, type Manual } from './manualModel';
import { PLANNED_SOPS, SOPS } from './sops';

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
      'Every procedure in the manual, whether or not it is in your copy. Each says why it is not here ' +
      'when it is not: another role’s procedure, outside your subscription, or not yet written. A ' +
      'procedure not yet written is listed rather than omitted, because an empty heading is worse ' +
      'than an acknowledged gap — and a list of only the ones you hold makes it impossible to tell ' +
      'the difference between the two.',
  });
  const included = new Set(manual.sops.map((s) => s.number));
  const withheldReason = new Map(manual.withheld.map((w) => [w.number, w.reason]));
  const register = [
    ...SOPS.map((sop) => ({
      number: sop.number,
      title: sop.title,
      area: sop.area,
      state: included.has(sop.number)
        ? 'in this copy'
        : (withheldReason.get(sop.number) ?? 'written, and addressed to another role'),
    })),
    ...PLANNED_SOPS.map((p) => ({ number: p.number, title: p.title, area: p.area, state: 'not yet issued' })),
  ].sort((a, b) => a.number.localeCompare(b.number));
  blocks.push({
    kind: 'bullets',
    items: register.map((r) => `${r.number} — ${r.title} (${AREA_LABEL[r.area]}) · ${r.state}`),
  });
  // An empty register is the finished state, and saying so is part of the
  // same promise the paragraph above makes. A reader who has been told
  // that unwritten procedures are listed needs to be told, once there are
  // none, that the absence means completeness rather than a dropped list.
  blocks.push({
    kind: 'para',
    muted: true,
    text:
      PLANNED_SOPS.length === 0
        ? `All ${SOPS.length} procedures in this manual's structure are written and issued. Nothing above is ` +
          'awaiting drafting; anything not in your copy is another role\u2019s, or outside your subscription, ' +
          'and the reason is given beside it.'
        : `${PLANNED_SOPS.length} procedure(s) above are not yet issued. They are named so that the shape of ` +
          'the manual is visible, and they will arrive in a later version.',
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
