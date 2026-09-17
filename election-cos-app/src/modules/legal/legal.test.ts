/**
 * Election Campaign OS — the legal document set
 *
 * These tests exist because of what the documents are used for. A defect
 * in a rendering helper shows up as a document that looks wrong. A defect
 * here shows up as a signed agreement that says something the software
 * does not do — and by then it has been relied on.
 *
 * Three classes of guard:
 *
 *  1. **The facts are real.** Every source file and every test named in
 *     the schedule has to exist. A schedule citing a deleted test is
 *     worse than no schedule, because it looks verified.
 *  2. **The packs stay packs.** A drafting pack that acquires an
 *     operative clause has quietly become an instrument drafted by
 *     someone who is not an attorney. The scan below is deliberately
 *     blunt.
 *  3. **The notices stay true.** The privacy notice and the residency
 *     disclosure may not make any of the claims in `MUST_NOT_CLAIM`,
 *     and must keep the specific sentences that make them accurate.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderDocumentDocx } from '@/lib/document/docxRenderer';
import { renderDocumentPdf } from '@/lib/document/pdfRenderer';
import type { Block, PrintDocument } from '@/lib/document/model';
import {
  buildLegalDocuments,
  CROSS_BORDER_DISCLOSURE,
  INSTRUMENTS,
  legalDraftingPacks,
  legalNotices,
  MUST_NOT_CLAIM,
  NO_OPERATIVE_CLAUSES,
  OPEN_QUESTIONS,
  PRODUCT_FACTS,
  SUPPRESSION_NOT_ERASURE,
} from './index';

const META = { organisation: 'Ward 12 Campaign Office', version: '1.0' };
const REPO = path.resolve(__dirname, '..', '..', '..');

/** Every word a document actually puts in front of a reader. */
function prose(doc: PrintDocument): string {
  const fromBlock = (block: Block): string => {
    switch (block.kind) {
      case 'steps':
      case 'bullets':
        return block.items.join('\n');
      case 'field':
        return `${block.label} ${block.value}`;
      case 'rule':
      case 'pageBreak':
        return '';
      default:
        return block.text;
    }
  };
  return [doc.title, doc.subtitle ?? '', ...doc.blocks.map(fromBlock)].join('\n');
}

/* -------------------------------------------------------------------- */
/* 1 — the facts are real                                               */
/* -------------------------------------------------------------------- */

function fileIndex(): { paths: Set<string>; basenames: Set<string> } {
  const paths = new Set<string>();
  const basenames = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      // Only source trees are walked, so there is no build output to skip
      // — and skipping a directory called `lib` would have hidden
      // `src/lib/` entirely, which is where half the cited files live.
      if (entry === 'node_modules') continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      paths.add(path.relative(REPO, full).replace(/\\/g, '/'));
      basenames.add(entry);
    }
  };
  walk(path.join(REPO, 'src'));
  walk(path.join(REPO, 'functions', 'src'));
  for (const entry of readdirSync(REPO)) {
    if (statSync(path.join(REPO, entry)).isFile()) {
      paths.add(entry);
      basenames.add(entry);
    }
  }
  return { paths, basenames };
}

/** Path-shaped tokens only — prose like "delete: if false" is skipped. */
const CITATION = /[A-Za-z0-9_./-]+\.(?:ts|tsx|rules)\b/g;

describe('the factual schedule cites things that exist', () => {
  const { paths, basenames } = fileIndex();

  it('finds the repository it is scanning', () => {
    expect(existsSync(path.join(REPO, 'package.json'))).toBe(true);
    expect(paths.has('firestore.rules')).toBe(true);
    expect(basenames.size).toBeGreaterThan(100);
  });

  it.each(PRODUCT_FACTS.map((f) => [f.claim.slice(0, 60), f] as const))('%s…', (_label, fact) => {
    const cited = [
      ...(fact.establishedIn.match(CITATION) ?? []),
      ...(fact.guardedBy.match(CITATION) ?? []),
    ];
    expect(cited.length, `${fact.claim} cites no file`).toBeGreaterThan(0);
    for (const citation of cited) {
      const found = citation.includes('/') ? paths.has(citation) : basenames.has(citation);
      expect(found, `${citation} does not exist`).toBe(true);
    }
  });

  it('names a test for every claim, not merely a source file', () => {
    for (const fact of PRODUCT_FACTS) {
      expect(fact.guardedBy, fact.claim).toMatch(/\.test\.ts\b/);
    }
  });

  it('keeps the africa-south1 pin it claims, in every function', () => {
    // The fact about region residency names this test as its guard, so
    // this is where the pin is actually checked.
    const dir = path.join(REPO, 'functions', 'src');
    const declared = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(path.join(dir, f), 'utf-8'))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(declared).toContain("'africa-south1'");
    // No function may name a region other than the pinned one.
    const regions = declared.match(/['"](?:us|eu|asia|australia|southamerica|northamerica|africa)-[a-z]+\d['"]/g) ?? [];
    expect(new Set(regions)).toEqual(new Set(["'africa-south1'"]));
  });
});

/* -------------------------------------------------------------------- */
/* 2 — the packs stay packs                                             */
/* -------------------------------------------------------------------- */

/**
 * Operative-clause language. Each pattern is the opening of a clause that
 * binds someone — not a word that merely appears in legal prose, which is
 * why "liability", "indemnity" and "warranty" are absent: the packs
 * discuss all three by name, and must be able to.
 */
const OPERATIVE: { name: string; pattern: RegExp }[] = [
  { name: 'obligation', pattern: /\b(?:you|the (?:subscriber|user|customer|licensee|company)) (?:shall|must|agrees? to)\b/i },
  { name: 'grant', pattern: /\bhereby\b/i },
  { name: 'liability cap', pattern: /\b(?:shall not exceed|in no event|aggregate liability)\b/i },
  { name: 'boilerplate', pattern: /\bto the (?:maximum|fullest) extent permitted\b/i },
  { name: 'warranty', pattern: /\b(?:warrants? and represents?|represents? and warrants?|as is, without warranty)\b/i },
  { name: 'governing law', pattern: /\bthis agreement (?:shall be|is) governed\b/i },
  { name: 'entire agreement', pattern: /\bconstitutes the entire agreement\b/i },
];

describe('a drafting pack is not an instrument', () => {
  const packs = legalDraftingPacks(META);

  it('produces one pack per instrument', () => {
    expect(packs).toHaveLength(INSTRUMENTS.length);
    expect(packs.map((p) => p.meta.reference)).toEqual(INSTRUMENTS.map((i) => i.reference));
  });

  it('marks every pack as a pack, not as a document to rely on', () => {
    for (const pack of packs) expect(pack.meta.status, pack.title).toBe('DRAFTING_PACK');
  });

  it('says on its own face that it contains no operative clauses', () => {
    for (const pack of packs) expect(prose(pack), pack.title).toContain(NO_OPERATIVE_CLAUSES);
  });

  it.each(OPERATIVE)('contains no $name clause', ({ pattern }) => {
    for (const pack of packs) {
      const hit = pattern.exec(prose(pack));
      expect(hit?.[0] ?? null, `${pack.title}: "${hit?.[0]}"`).toBeNull();
    }
  });

  it('carries all three schedules, in every pack', () => {
    for (const pack of packs) {
      const text = prose(pack);
      expect(text, pack.title).toContain('Schedule A · What the product does');
      expect(text, pack.title).toContain('Schedule B · Claims this instrument must not make');
      expect(text, pack.title).toContain('Schedule C · Open questions across the whole set');
      for (const open of OPEN_QUESTIONS) expect(text, pack.title).toContain(open.question);
    }
  });

  it('leaves the company decisions blank rather than filling them in', () => {
    for (const spec of INSTRUMENTS) {
      expect(spec.decisionsRequired.length, spec.title).toBeGreaterThan(0);
      expect(spec.questions.length, spec.title).toBeGreaterThan(0);
    }
  });

  it('states no price anywhere, including in the pricing pack', () => {
    for (const pack of packs) {
      expect(prose(pack), pack.title).not.toMatch(/\bR\s?\d/);
      expect(prose(pack), pack.title).not.toMatch(/\bZAR\b/);
    }
  });
});

/* -------------------------------------------------------------------- */
/* 3 — the notices stay true                                            */
/* -------------------------------------------------------------------- */

describe('the factual notices', () => {
  const [privacy, residency, capability] = legalNotices(META);

  it('are drafted, but never presented as reviewed', () => {
    for (const notice of [privacy, residency, capability]) {
      expect(notice.meta.status, notice.title).toBe('DRAFT_PENDING_REVIEW');
    }
  });

  it('does not promise erasure it cannot deliver', () => {
    const text = prose(privacy);
    expect(text).toContain(SUPPRESSION_NOT_ERASURE);
    expect(text).toMatch(/suppress/i);
    expect(text).not.toMatch(/\b(?:permanently|irreversibly) (?:deleted|erased|purged|destroyed)\b/i);
    expect(text).not.toMatch(/\bpurged\b/i);
  });

  it('describes the response target as internal, never as statutory', () => {
    const text = prose(privacy);
    expect(text).toMatch(/internal target/i);
    expect(text).not.toMatch(/statutory (?:deadline|period|turnaround|target|window)/i);
  });

  it('discloses the cross-border transfer rather than denying one', () => {
    for (const notice of [privacy, residency]) {
      expect(prose(notice), notice.title).toContain(CROSS_BORDER_DISCLOSURE);
      expect(prose(notice), notice.title).not.toMatch(/never leaves (?:South Africa|the Republic)/i);
    }
  });

  it('claims no filing, certification or guarantee', () => {
    for (const notice of [privacy, residency]) {
      const text = prose(notice);
      expect(text, notice.title).not.toMatch(/\b(?:files?|submits?|lodges?)\b[^.]{0,60}\bElectoral Commission\b/i);
      expect(text, notice.title).not.toMatch(/\b(?:ensures?|guarantees?|certifies)\b[^.]{0,40}\bcompli/i);
    }
  });

  it('states every prohibition in the capability statement as a refusal, not a claim', () => {
    const text = prose(capability);
    for (const prohibition of MUST_NOT_CLAIM) {
      expect(text, prohibition.claim).toContain(prohibition.because);
    }
    expect(text).toContain('It does not claim that');
  });
});

/* -------------------------------------------------------------------- */
/* the whole set                                                        */
/* -------------------------------------------------------------------- */

describe('the document set', () => {
  const docs = buildLegalDocuments(META);

  it('has a unique reference for every document', () => {
    const refs = docs.map((d) => d.meta.reference);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('renders every document in both formats, deterministically', () => {
    for (const doc of docs) {
      const pdf = renderDocumentPdf(doc);
      const docx = renderDocumentDocx(doc);
      expect(pdf.length, doc.title).toBeGreaterThan(2000);
      expect(docx.length, doc.title).toBeGreaterThan(2000);
      expect(Array.from(renderDocumentPdf(doc)), doc.title).toEqual(Array.from(pdf));
      expect(Array.from(renderDocumentDocx(doc)), doc.title).toEqual(Array.from(docx));
    }
  });

  it('never presents any of them as issued', () => {
    for (const doc of docs) expect(doc.meta.status, doc.title).not.toBe('ISSUED');
  });
});
