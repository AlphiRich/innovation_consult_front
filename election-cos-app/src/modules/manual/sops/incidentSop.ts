/**
 * Election Campaign OS — SOP-06, Logging, triaging and escalating an incident
 *
 * The one procedure in this manual that four roles share, and the only one
 * where the record leaves the campaign: a referral is a document addressed
 * to a municipality, carrying the party's name.
 *
 * Writing it found two defects on the path. A Canvasser holds
 * `incidents.create` and not `incidents.view`, so the Incidents nav item
 * was hidden from them and the only route to the form was one they could
 * not reach — a permission with nowhere to use it. And `IncidentStatus`
 * declared six states of which the product could reach four: RESOLVED and
 * CLOSED were in the type, in the labels and in the status tabs, and no
 * capability, repository method or security rule could put an incident
 * into either. Both are fixed; this describes the fixed behaviour.
 *
 * Claims are asserted in `manual.test.ts` by running the workflow model,
 * and the model is itself checked against `firestore.rules` — so a step
 * this SOP describes is a step the database will actually permit.
 */
import { CATEGORY_LABEL, STATUS_LABEL } from '@/modules/incidents/incidentMeta';
import { INCIDENT_TRANSITIONS } from '@/modules/incidents/incidentWorkflow';
import { STANDING_DISCLAIMER } from '@/modules/incidents/referral/referralDocument';
import type { Sop } from '../manualModel';

/** The forward path, in the words the buttons use. */
const FORWARD = ['LOGGED', 'TRIAGED', 'ESCALATED', 'REFERRED'] as const;

export const INCIDENT_SOP: Sop = {
  number: 'SOP-06',
  title: 'Logging, triaging and escalating an incident',
  area: 'FIELD',
  roles: ['canvasser', 'vd-captain', 'ward-lead', 'municipal-team-lead'],
  requiresAnyCapability: ['incidents.create', 'incidents.view'],
  purpose:
    'How a service delivery problem seen at a door becomes a document addressed to a municipality: who logs ' +
    'it, who confirms how serious it is, who authorises the referral, and what happens to the record ' +
    'afterwards.',
  sections: [
    {
      heading: 'What an incident is here, and what it is not',
      body: [
        'An incident is a service delivery problem affecting a street: ' +
          Object.values(CATEGORY_LABEL).join(', ').toLowerCase() +
          '. Those four categories are the whole list, and the database refuses anything outside them — there is no free-text category, deliberately, because a taxonomy that grows one report at a time cannot be counted.',
        'It is about a place, not about a person. A complaint about a neighbour, a dispute between residents, or anything about the people at an address is not an incident and does not belong in this record. Safety information about a household goes in the access note instead — SOP-01.',
      ],
      warnings: [
        'This is not an emergency service. Logging an incident sends nothing to anybody, alerts nobody, and dispatches nothing. If someone is in danger, phone the people whose job that is, and log the record afterwards.',
      ],
    },
    {
      heading: 'Logging one, as a canvasser',
      body: [
        'From the round, choose "Report an incident". Pick the category, describe what you can see, and add a photograph if you have one.',
      ],
      steps: [
        'Describe what is there, not what should be done about it. "Sewage across the pavement outside number 14 for at least three days" is a record somebody can act on; "council is useless" is not.',
        'Name the street. The voting district comes from your own assignment, so the record is already in the right place — what it cannot supply is where in the district.',
        'Add a photograph if you can. A referral carries far more weight with one.',
        'Submit it. It goes to your VD captain or ward lead, who decides how serious it is.',
      ],
      warnings: [
        'A canvasser cannot see incidents after logging them, including their own. That is deliberate — following one through is a supervisor’s job — but it means the platform will never tell you what happened to it. If it is urgent, say so to your captain directly; logging is not raising an alarm.',
        'Photograph the problem, not people. A photograph of a resident is personal information the campaign now holds, attached to a document it may send to a municipality.',
      ],
    },
    {
      heading: 'Triage: confirming how serious it is',
      body: [
        'Whoever holds triage — a ward lead, or the HQ admin — reviews what was logged and confirms or adjusts the severity. That is what moves an incident from ' +
          STATUS_LABEL.LOGGED.toLowerCase() +
          ' to ' +
          STATUS_LABEL.TRIAGED.toLowerCase() +
          '.',
        'Severity is the campaign’s own judgement of urgency. It is not a municipal classification, it does not correspond to anything in a service level agreement, and nothing in the platform treats it as more than a sort order.',
      ],
      warnings: [
        'Whoever triages cannot escalate, and whoever escalates cannot triage. That is deliberate: the person who decides something is critical should not also be the person who authorises the document that says so on the party’s behalf.',
      ],
    },
    {
      heading: 'Escalation and the referral',
      body: [
        'A municipal lead escalates a triaged incident, then prepares the referral — the document that actually goes to the municipality. Preparing it produces a draft, watermarked as one, which can be read and checked before anything is issued.',
        'Issuing it is the authorisation step. It stamps the document, records who authorised it and when, stores it, and moves the incident to ' +
          STATUS_LABEL.REFERRED.toLowerCase() +
          '. Every issued referral carries an integrity hash, so the copy a municipality holds can be checked against the record the campaign kept.',
      ],
      warnings: [
        STANDING_DISCLAIMER,
        'The platform sends nothing. It produces a document; a person delivers it, by whatever channel the municipality actually uses, and records having done so. If nobody takes that step, an incident marked referred has been referred to a filing cabinet.',
      ],
    },
    {
      heading: 'Closing the loop',
      body: [
        'An incident does not end at the referral. Two more moves exist, and until they are used a campaign’s count of open incidents only ever goes up.',
      ],
      steps: [
        'Mark it resolved when the problem is actually fixed. Whoever triages can do it, from any point after triage — a municipality sometimes acts before a referral is ever issued.',
        'Close it when the campaign will do nothing further: resolved and finished with, a duplicate, out of scope, or the resident withdrew. That takes the same authority as escalation.',
        'Closing is the end of the record. There is no reopening — if the problem comes back, it is a new incident, and it should be, because it happened again.',
      ],
      warnings: [
        'Nothing here deletes an incident. Closed means the campaign has stopped working on it, not that the record has gone — it has not, and it cannot be made to.',
        'An incident resolved or closed drops out of the open count, which is the point. Leaving everything at referred makes the war room’s numbers meaningless within a month.',
      ],
    },
    {
      heading: 'Who does which step',
      body: [
        'Four roles share this procedure and none of them can do all of it. The steps and the permission each needs:',
      ],
      steps: INCIDENT_TRANSITIONS.filter(
        (transition, index, all) => all.findIndex((t) => t.label === transition.label) === index,
      ).map(
        (transition) =>
          `${transition.label} — needs ${transition.capability}, from ${STATUS_LABEL[transition.from].toLowerCase()}.`,
      ),
      warnings: [
        'If a button you expect is not there, you do not hold that permission. The platform will not offer a step it would then refuse, and the refusal is the separation of duties working rather than a fault.',
        'Everything you see is your own ground. A ward lead triages their ward; a VD captain sees their district. Nothing widens that, including holding the permission.',
      ],
    },
  ],
};

/** Exported so `manual.test.ts` can assert the SOP walks the real path. */
export const INCIDENT_FORWARD_PATH = FORWARD;
