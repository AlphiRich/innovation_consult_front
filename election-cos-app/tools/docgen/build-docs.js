/**
 * Generates three .docx deliverables styled per the Innovation Consult
 * letterhead/cover system (extracted from the "Letterhead Options" Claude
 * Design canvas: 6 cover systems 3a-3f + back covers + 1a/1b letterheads).
 *
 * Real logo/icon image files (logo-full-trimmed-v2.png, icon-only-v2.png)
 * were not supplied with the design canvas export — only HTML describing
 * their placement. A text wordmark placeholder is used instead; swap in
 * the real files when available.
 *
 * Brand colours (hex, extracted from the canvas's rgb() values):
 *   ink    #13244A  (navy - primary)
 *   gold   #C9A227  (accent)
 *   maroon #7B1E30  (section labels / legal accent)
 *   cream  #F4EFE2  (paper)
 *   legalBg #E4E7EA (3f Legal & Compliance cover background)
 *   slate  #5A5648  (fine print)
 * This is the Innovation Consult CORPORATE identity for publications
 * (reports, policies, contracts) — a distinct namespace from the
 * Election-COS1.0 PRODUCT design tokens in src/design/tokens.ts. Do not
 * conflate the two; #13244A and the product's #1A2246 are both "navy" but
 * are not the same value and come from different source systems.
 */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle, PageBreak, Header, Footer,
  PageNumber, ExternalHyperlink,
} = require('docx');

const BRAND = {
  ink: '13244A',
  gold: 'C9A227',
  maroon: '7B1E30',
  cream: 'F4EFE2',
  legalBg: 'E4E7EA',
  slate: '5A5648',
  white: 'FFFFFF',
};

const COMPANY = {
  legalName: 'Just Be Trading 10 (Pty) Ltd t/a Innovation Consult (Pty) Ltd',
  regNo: '2007/021390/07',
  directors: 'M. K. N. Dlutu & A. N. Dlutu',
  address: 'P.O. Box 2590, Potchefstroom, 2520, N.W. Province, South Africa',
  phone: '+27 (0)67 907 1580',
  // The letterhead canvas cited innovationconsult.com; confirmed by the
  // human (9 Aug 2026) that the actually-registered domain is
  // innovationconsult.co.za — used here, not the canvas's .com.
  email: 'info@innovationconsult.co.za',
  web: 'www.innovationconsult.co.za',
};

const HEADING_FONT = 'Poppins';
const BODY_FONT = 'Arial';

function wordmark() {
  // Placeholder for logo-full-trimmed-v2.png — not supplied with this
  // export. Swap this table cell for an ImageRun once the real logo file
  // is available.
  return new Table({
    width: { size: 3200, type: WidthType.DXA },
    columnWidths: [3200],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BRAND.ink },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND.ink },
      left: { style: BorderStyle.SINGLE, size: 4, color: BRAND.ink },
      right: { style: BorderStyle.SINGLE, size: 4, color: BRAND.ink },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3200, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: BRAND.white },
            margins: { top: 160, bottom: 160, left: 160, right: 160 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'INNOVATION', bold: true, size: 22, font: HEADING_FONT, color: BRAND.ink }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'CONSULT', bold: true, size: 22, font: HEADING_FONT, color: BRAND.gold }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Cover page matching the 3a-3f "book cover" system: classification strip
 * label, wordmark, title, gold rule, subtitle, and a document-metadata
 * strip (Document ID / Author / Date / Revision / Version).
 */
function buildCoverPage({ classification, title, subtitle, docId, coverBg, accentColor, textColor, draft }) {
  const children = [];

  children.push(
    new Table({
      width: { size: 9350, type: WidthType.DXA },
      columnWidths: [9350],
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9350, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: coverBg },
              margins: { top: 500, bottom: 500, left: 500, right: 500 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: classification.toUpperCase(),
                      bold: true,
                      size: 18,
                      font: HEADING_FONT,
                      color: accentColor,
                      characterSpacing: 30,
                    }),
                  ],
                }),
                new Paragraph({ children: [], spacing: { after: 200 } }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [] }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  children.push(wordmark());
  children.push(new Paragraph({ children: [], spacing: { after: 400 } }));

  if (draft) {
    children.push(
      new Table({
        width: { size: 9350, type: WidthType.DXA },
        columnWidths: [9350],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 9350, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: BRAND.maroon },
                margins: { top: 160, bottom: 160, left: 200, right: 200 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: 'DRAFT — NOT FOR PUBLICATION — REQUIRES ATTORNEY REVIEW',
                        bold: true,
                        size: 20,
                        font: HEADING_FONT,
                        color: BRAND.white,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
    children.push(new Paragraph({ children: [], spacing: { after: 400 } }));
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 56, font: HEADING_FONT, color: BRAND.ink })],
      spacing: { after: 200 },
    }),
  );
  children.push(
    new Table({
      width: { size: 1200, type: WidthType.DXA },
      columnWidths: [1200],
      rows: [
        new TableRow({
          height: { value: 60, rule: 'exact' },
          children: [
            new TableCell({
              width: { size: 1200, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: accentColor },
              children: [new Paragraph({ children: [] })],
            }),
          ],
        }),
      ],
    }),
  );
  children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  children.push(
    new Paragraph({
      children: [new TextRun({ text: subtitle, italics: true, size: 24, font: BODY_FONT, color: BRAND.slate })],
      spacing: { after: 600 },
    }),
  );

  const metaRow = (label, value) =>
    new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 17, font: BODY_FONT, color: textColor }),
        new TextRun({ text: value, size: 17, font: BODY_FONT, color: textColor }),
      ],
      spacing: { after: 60 },
    });

  children.push(metaRow('DOCUMENT ID', docId));
  children.push(metaRow('AUTHOR', 'Innovation Consult (Pty) Ltd'));
  children.push(metaRow('DATE OF PUBLICATION', draft ? '[Pending attorney review]' : new Date().toISOString().slice(0, 10)));
  children.push(metaRow('REVISION', '00    VERSION: v1.0'));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  return children;
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, font: HEADING_FONT, color: BRAND.ink })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, font: BODY_FONT, size: 22, ...opts })],
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: BODY_FONT, size: 22 })],
  });
}

/** Mirrors the back-cover copyright/disclaimer block from the design canvas. */
function backCoverSection(extraDisclaimer) {
  const year = new Date().getFullYear();
  return [
    new Paragraph({ children: [new PageBreak()] }),
    heading('Copyright & Disclaimer', HeadingLevel.HEADING_2),
    body(
      `© ${year} ${COMPANY.legalName}. All rights reserved. Registration Number: ${COMPANY.regNo}. No part ` +
        'of this publication may be reproduced, distributed, or transmitted in any form or by any means, ' +
        'including photocopying, recording, or other electronic or mechanical methods, without the prior ' +
        'written permission of Innovation Consult, except in the case of brief quotations embodied in critical ' +
        'reviews and other noncommercial uses permitted by copyright law.',
    ),
    body(
      'Disclaimer: This document is provided for informational purposes only and does not constitute ' +
        'professional, legal, financial, or investment advice. While every effort has been made to ensure the ' +
        'accuracy of the information contained herein, Innovation Consult makes no warranties, express or ' +
        'implied, regarding the completeness, reliability, or suitability of this content. Innovation Consult, ' +
        'its directors, employees, and agents accept no liability for any loss or damage of any kind arising ' +
        'from reliance on this document.',
    ),
    ...(extraDisclaimer ? [body(extraDisclaimer, { bold: true, color: BRAND.maroon })] : []),
    new Paragraph({ children: [], spacing: { before: 300 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${COMPANY.address}  |  ${COMPANY.phone}  |  ${COMPANY.email}  |  ${COMPANY.web}`,
          size: 16,
          font: BODY_FONT,
          color: BRAND.slate,
        }),
      ],
    }),
  ];
}

function footerBlock() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `${COMPANY.legalName}  |  Reg. ${COMPANY.regNo}  |  Page `, size: 14, color: BRAND.slate }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: BRAND.slate }),
          new TextRun({ text: ' of ', size: 14, color: BRAND.slate }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: BRAND.slate }),
        ],
      }),
    ],
  });
}

async function writeDoc(filename, sections) {
  const doc = new Document({
    sections,
    styles: {
      default: {
        document: { run: { font: BODY_FONT, size: 22 } },
      },
    },
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(filename, buf);
  console.log('wrote', filename, buf.length, 'bytes');
}

// ---------------------------------------------------------------------
// Document 1 — Privacy Policy (DRAFT)
// ---------------------------------------------------------------------
async function buildPrivacyPolicy() {
  const cover = buildCoverPage({
    classification: 'Legal, Policy & Regulatory Compliance',
    title: 'Privacy Policy',
    subtitle: 'Election-COS1.0 — Draft for Attorney Review',
    docId: 'IC-ECOS-L1-2026-DRAFT',
    coverBg: BRAND.legalBg,
    accentColor: BRAND.maroon,
    textColor: BRAND.ink,
    draft: true,
  });

  const body_ = [
    body(
      'This Privacy Policy is a working draft prepared to support attorney review before publication. It is ' +
        'NOT a final, legally-reviewed document, and must not be published, linked from the application, or ' +
        'relied upon until an admitted attorney has reviewed and approved it (see the legal compliance ' +
        'workstream, action LG2). Content below is drawn directly from the governing build specification and ' +
        'legal compliance workstream; nothing here is invented.',
      { bold: true, color: BRAND.maroon },
    ),
    heading('1. Introduction and scope'),
    body(
      'This policy explains how Election-COS1.0 ("the Platform"), built and operated by Innovation Consult ' +
        `(Pty) Ltd (Reg. ${COMPANY.regNo}), processes personal information in connection with South African ` +
        'local government election campaign field operations.',
    ),
    heading('2. Roles under POPIA'),
    body('The political party or candidate using the Platform is the Responsible Party — they determine the purpose and means of processing.'),
    body('Innovation Consult (Pty) Ltd is the Operator — it processes personal information on the Responsible Party’s behalf, under an Operator Agreement.'),
    body('Data subjects are voters, constituents, campaign staff, donors, and candidates, as applicable to each data category below.'),
    heading('3. Categories of personal information processed'),
    bullet('Contact information: name, phone number (masked in the UI, encrypted at rest), household address or an informal-settlement descriptor.'),
    bullet('Political opinion: support sentiment tier. This is special personal information under POPIA section 26 — see §5.'),
    bullet('Consent record: whether consent was given, timestamp, method (verbal doorstep, written, or digital), and the language used.'),
    bullet('Location: GPS coordinates captured at the point of data entry, where applicable.'),
    bullet('Incident data: description, category, photographs, and location, for constituents reporting service-delivery issues.'),
    bullet('Campaign staff identity: email address and an opaque user ID, processed by Firebase Authentication (United States) — see §6.'),
    bullet('Campaign staff profile: name, phone number, role, and geographic assignment, stored in South Africa.'),
    bullet('Candidate information: name and South African ID number (encrypted at rest, masked in every screen), for IEC submission purposes.'),
    bullet('Donor and donation information (where the Funding & Disclosure module is used): donor identity, contact details, and donation records, processed to meet Political Party Funding Act obligations.'),
    heading('4. Data residency'),
    body(
      'All voter and constituent personal information is stored in South Africa (Google Cloud africa-south1, ' +
        'Johannesburg). Staff account identifiers are processed by Google Firebase Authentication, which does ' +
        'not currently offer regional data residency and stores staff identity records (user ID and email ' +
        'address only) in the United States. No further staff information — name, phone number, role, or ' +
        'geographic assignment — is ever written to that record; it lives in the South African-hosted database ' +
        'described above.',
    ),
    heading('5. Special personal information — political opinion'),
    body(
      'A voter’s recorded support sentiment is political opinion, and therefore special personal information ' +
        'under POPIA section 26. It is recorded only after explicit consent captured at the point of contact ' +
        '(typically the doorstep), using a consent script that discloses plainly that political support ' +
        'preference is being recorded. The system rejects any attempt to save voter data without a recorded ' +
        'consent. [ATTORNEY REVIEW NEEDED: confirm the consent basis under section 26 is correctly and ' +
        'sufficiently documented — legal compliance workstream action LG3.]',
    ),
    heading('6. Lawful basis for processing'),
    bullet('Voter and constituent data: consent, captured at the point of contact.'),
    bullet('Donor and donation data: necessary to comply with an obligation imposed by law (POPIA section 11(1)(c) and Political Party Funding Act section 6).'),
    bullet('Campaign staff data: necessary for the performance of the staff member’s role.'),
    heading('7. Security safeguards'),
    bullet('Encryption in transit (TLS) and at rest for sensitive fields (phone numbers, SA ID numbers, donor identity numbers).'),
    bullet('Role-based access control and per-user capability overrides — access to voter, donor, and candidate data is restricted to staff granted the relevant capability.'),
    bullet('Tenant isolation — one party’s data is never visible to another party using the same Platform.'),
    bullet('An append-only audit trail of sensitive actions (unmasking a phone number or ID, exporting donor records, changing a statutory threshold).'),
    bullet('A documented breach-response process (legal compliance workstream action LG7).'),
    heading('8. Your rights as a data subject'),
    body(
      'You may request access to, correction of, or deletion of your personal information. Requests are logged ' +
        'and tracked to resolution through the Platform’s data subject request workflow. [ATTORNEY REVIEW ' +
        'NEEDED: confirm the response-time commitment stated to data subjects, if any — POPIA does not set a ' +
        'fixed statutory deadline the way some other privacy laws do; the Platform currently uses a 30-day ' +
        'internal working target, not a legal commitment, pending this review.]',
    ),
    heading('9. Retention'),
    body('Personal information is retained for as long as necessary for the purposes described above, and as required by applicable electoral and tax law. [ATTORNEY REVIEW NEEDED: confirm specific retention periods.]'),
    heading('10. Changes to this policy'),
    body('This policy may be updated from time to time. Material changes will be communicated to Responsible Parties using the Platform.'),
    heading('11. Contact'),
    body(`Information Officer: [to be designated and registered with the Information Regulator — legal compliance workstream action LG1]. General enquiries: ${COMPANY.email}.`),
  ];

  return [
    {
      properties: {},
      headers: {},
      footers: { default: footerBlock() },
      children: [...cover, ...body_, ...backCoverSection('This is a draft. Do not publish without attorney sign-off.')],
    },
  ];
}

// ---------------------------------------------------------------------
// Document 2 — Terms of Use (DRAFT)
// ---------------------------------------------------------------------
async function buildTermsOfUse() {
  const cover = buildCoverPage({
    classification: 'Legal, Policy & Regulatory Compliance',
    title: 'Terms of Use',
    subtitle: 'Election-COS1.0 — Draft for Attorney Review',
    docId: 'IC-ECOS-L2-2026-DRAFT',
    coverBg: BRAND.legalBg,
    accentColor: BRAND.maroon,
    textColor: BRAND.ink,
    draft: true,
  });

  const body_ = [
    body(
      'This Terms of Use document is a working draft prepared to support attorney review before publication. ' +
        'It is NOT final and must not be published or relied upon until reviewed and approved by an admitted ' +
        'attorney.',
      { bold: true, color: BRAND.maroon },
    ),
    heading('1. Acceptance of these terms'),
    body(`By creating an account on or otherwise using Election-COS1.0 ("the Platform"), you agree to these Terms of Use, offered by ${COMPANY.legalName}.`),
    heading('2. Description of service'),
    body(
      'The Platform is a campaign management and field-operations tool for South African political parties, ' +
        'independent candidates, and municipal campaign teams, covering voter and household capture, incident ' +
        'management, field diary and logistics coordination, and — where enabled — Political Party Funding Act ' +
        'donation disclosure support.',
    ),
    heading('3. Operator status'),
    body(
      `${COMPANY.legalName} acts as an Operator under the Protection of Personal Information Act, processing ` +
        'personal information on behalf of the political party or candidate using the Platform (the Responsible ' +
        'Party). See the Privacy Policy for the full data-protection framework.',
    ),
    heading('4. User responsibilities'),
    bullet('Obtain and accurately record consent before capturing a voter’s political opinion or contact information.'),
    bullet('Use the doorstep consent script as provided, without altering its substantive disclosures.'),
    bullet('Keep account credentials confidential and report suspected unauthorised access promptly.'),
    bullet('Use captured data only for lawful campaign purposes consistent with these terms.'),
    heading('5. Prohibited uses'),
    bullet('Using the Platform to harass, intimidate, or unlawfully discriminate against any person.'),
    bullet('Attempting to access data outside your assigned geographic scope or capability grants.'),
    bullet('Exporting or disclosing voter, donor, or candidate data other than as permitted by your role.'),
    bullet('Using the Platform’s gatherings advisory content as a substitute for filing a required notice with the responsible local authority — the Platform does not file notices or track compliance on your behalf.'),
    heading('6. Disclaimers'),
    body(
      'The Platform, including its gatherings advisory content, seat-allocation calculator, and any analytics or ' +
        'reporting features, provides general information and operational tooling. It is not legal, electoral, ' +
        'or financial advice. Consult your party’s legal officer or an admitted attorney for advice specific ' +
        'to your circumstances.',
    ),
    heading('7. Limitation of liability'),
    body(`${COMPANY.legalName}, its directors, employees, and agents accept no liability for any loss or damage arising from reliance on the Platform beyond what is required by law. [ATTORNEY REVIEW NEEDED: standard limitation-of-liability clause appropriate to a SaaS platform handling special personal information.]`),
    heading('8. Termination'),
    body('Access may be suspended or terminated for breach of these terms, non-payment, or at the end of a licensing cycle, as set out in the applicable commercial agreement.'),
    heading('9. Governing law'),
    body('These terms are governed by the law of the Republic of South Africa.'),
    heading('10. Contact'),
    body(`${COMPANY.email}`),
  ];

  return [
    {
      properties: {},
      headers: {},
      footers: { default: footerBlock() },
      children: [...cover, ...body_, ...backCoverSection('This is a draft. Do not publish without attorney sign-off.')],
    },
  ];
}

// ---------------------------------------------------------------------
// Document 3 — App User Guide (complete, not attorney-gated)
// ---------------------------------------------------------------------
async function buildUserGuide() {
  const cover = buildCoverPage({
    classification: 'Application & Product Development Plan',
    title: 'User Guide',
    subtitle: 'Election-COS1.0 — Field & Command Reference',
    docId: 'IC-ECOS-USERGUIDE-2026',
    coverBg: '1C2027',
    accentColor: BRAND.gold,
    textColor: BRAND.cream,
    draft: false,
  });

  const body_ = [
    heading('1. What Election-COS1.0 is'),
    body(
      'Election-COS1.0 is an offline-first field operations and compliance platform for South African local ' +
        'government election campaigns. It exists because campaigns are won or lost on the efficiency of their ' +
        'data-gathering machinery: every voter conversation, every household visit, every reported service ' +
        'failure, and every donation captured cleanly and consistently is a strategic asset — one captured ' +
        'poorly, or lost to a bad sync, is a strategic cost. Every workflow in this guide exists to make that ' +
        'machinery reliable, even on a phone in a dead zone during loadshedding.',
    ),
    heading('2. Signing in and understanding your role'),
    body(
      'You sign in with the email and password issued by your Party HQ Admin. What you can see and do is ' +
        'determined by your role’s default capabilities plus any individual overrides granted to you — this ' +
        'is a grants model, not a fixed job title. Two staff with the same title can have different access if ' +
        'one has been granted an override. If a screen or action you expect to see is missing, ask your Party ' +
        'HQ Admin or Compliance Officer to check your permissions under Settings → Permissions.',
    ),
    body('Seed roles and what they’re for:'),
    bullet('Party HQ Admin — full tenant-wide access, including team management and threshold configuration.'),
    bullet('Municipal Team Lead — municipality-wide operational access.'),
    bullet('Ward Lead — ward-scoped access, including incident triage.'),
    bullet('VD Captain — voting-district-scoped field capture.'),
    bullet('Canvasser — voting-district-scoped voter and household capture, and incident logging.'),
    bullet('Compliance Officer — tenant-wide view and edit access to funding & disclosure records.'),
    bullet('Finance Officer — full funding & disclosure access, including statutory threshold configuration.'),
    heading('3. Navigation'),
    body('The same nine-item menu appears for everyone; what renders inside each section depends on your capabilities.'),
    bullet('War Room — command-centre view of field activity, read from pre-aggregated counters (never a live scan of every record, to keep the app fast and stay within free-tier limits).'),
    bullet('Voters — capture and review individual voter records, sentiment, and consent status.'),
    bullet('Wards — ward and voting-district reference data.'),
    bullet('Field Diary — canvassing session and street-level progress logs.'),
    bullet('Incidents — service-delivery issue reports, from first log through triage, escalation, and a signed referral document.'),
    bullet('Logistics — inventory and resupply requests.'),
    bullet('Funding & Disclosure — donor and donation records, visible only with the relevant capability.'),
    bullet('Analytics — reporting, including the seat-allocation calculator.'),
    bullet('Settings — municipality configuration, permissions, statutory threshold configuration, and data subject requests.'),
    heading('4. Capturing a voter'),
    body('Open Voters, choose the voting district you’re working in (or it’s pre-filled from your assignment), and select "New voter."'),
    bullet('Select the household the voter belongs to. If the household isn’t listed yet, it needs to be captured first — households, not raw street addresses, are the working unit, because a large share of the population lives in informal settlements without formal addressing.'),
    bullet('Enter the voter’s name and, if given, a phone number. The number is masked for display immediately (e.g. "082 •••• 567") — nobody browsing the list sees the full number.'),
    bullet('Record sentiment on the five-point scale, from Strong Opposition to Strong Support. Update it any time via "Log response" on that voter’s card.'),
    bullet('Consent is not optional. You must confirm the voter has given consent, and record how (verbal at the doorstep, written, or digital) before the record can be saved. This is enforced at the database level, not just in the form — there is no way to bypass it.'),
    heading('5. Working offline'),
    body(
      'Voter capture, household capture, incident logging with photos, diary entries, and task completion all ' +
        'work with no signal. Your device queues the work locally and syncs automatically once it reconnects. ' +
        'If two people edit the same record while both offline, the app merges non-conflicting field changes ' +
        'automatically and only asks you to resolve a genuine conflict — one where you and someone else changed ' +
        'the same field. Conflicts are never silently discarded; they sit in a review queue until a person ' +
        'looks at both versions and chooses. A record that’s rejected for missing consent is clearly marked ' +
        'and stops retrying, rather than failing silently in the background — you’ll be told exactly what to ' +
        'do about it.',
    ),
    heading('6. Incidents'),
    body('A field-reported service-delivery issue moves through a fixed workflow: a canvasser logs it against one of four categories (Water & Sanitation, Electricity, Roads & Transport, Public Safety); a Ward Lead triages it and sets severity; a Municipal Team Lead can escalate it; and an authorised escalation produces a signed, watermarked referral document with a document integrity hash, ready to hand to the relevant municipal official.'),
    heading('7. Funding & disclosure'),
    body(
      'Where enabled, this module records donors and donations against the statutory Political Party Funding ' +
        'Act thresholds, which are configurable per tenant (not hard-coded) because the law can change. A ' +
        'donation is never blocked from being recorded, even if it appears to breach a threshold — the system ' +
        'flags it and notifies a named Finance Officer or Compliance Officer for human judgement, rather than ' +
        'silently refusing a lawful donation on a misconfigured rule.',
    ),
    heading('8. Gatherings advisory'),
    body('A static reference page under Settings explains the notice requirements of the Regulation of Gatherings Act. It is general information only — the Platform does not file notices or track your compliance for you. Speak to your party’s legal officer before a public gathering.'),
    heading('9. Getting help'),
    body(`Contact your Party HQ Admin for account and permissions issues. For platform issues, contact ${COMPANY.email}.`),
    heading('10. Glossary'),
    bullet('VD — Voting District, the smallest IEC-defined geographic unit.'),
    bullet('Ward — a municipal ward, containing one or more VDs.'),
    bullet('POPIA — Protection of Personal Information Act 4 of 2013.'),
    bullet('PPFA — Political Party Funding Act 6 of 2018.'),
    bullet('Capability — a specific permission (e.g. "voters.edit"), granted by role default or individual override.'),
  ];

  return [
    {
      properties: {},
      headers: {},
      footers: { default: footerBlock() },
      children: [...cover, ...body_, ...backCoverSection()],
    },
  ];
}

(async () => {
  const outDir = '/home/user/innovation_consult_front/election-cos-app/docs';
  await writeDoc(`${outDir}/legal-drafts/privacy-policy-DRAFT.docx`, await buildPrivacyPolicy());
  await writeDoc(`${outDir}/legal-drafts/terms-of-use-DRAFT.docx`, await buildTermsOfUse());
  await writeDoc(`${outDir}/app-user-guide.docx`, await buildUserGuide());
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
