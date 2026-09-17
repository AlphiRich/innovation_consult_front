/**
 * Election Campaign OS — SOP-02, Setting up a tenant and inviting your team
 *
 * The administrator's first hour. Everything else in this manual assumes
 * this was done, and done in this order.
 *
 * Like SOP-01, every claim is asserted against the code in
 * `manual.test.ts` — the roles it names come from `seedRoles.ts`, the
 * refusals it describes come from `staffProvisioning.ts`, and the
 * separation-of-duties rule it states is the one `roleModel.test.ts`
 * enforces. Writing this SOP is what found two defects on the path it
 * documents: a capability resolver that stamped an empty token for every
 * role, and an access screen that told a person to ask for access without
 * telling them what to send. Both are fixed; the SOP describes the fixed
 * behaviour.
 */
import { SEED_ROLES } from '@/auth/seedRoles';
import { SIGN_IN_ID_BASIS } from '@/modules/settings/staffProvisioning';
import type { Sop } from '../manualModel';

/**
 * One line per role, in the manual's voice rather than the capability
 * list's. Exported so `manual.test.ts` can assert every role in the table
 * has one — a role added without prose would otherwise print its name
 * followed by the word "undefined" in a document sent to a subscriber.
 */
export const ROLE_PURPOSE: Record<string, string> = {
  'party-hq-admin':
    'runs the tenant. Configures the municipality, adds and removes people, and reads everything — but ' +
    'deliberately cannot edit a voter record or a donation.',
  'municipal-team-lead': 'runs a municipality: the war room, the diary, escalations, and the teams under it.',
  'ward-lead': 'runs a ward. Sees their ward and no other.',
  'vd-captain': 'runs a voting district and the canvassers in it.',
  canvasser: 'works doorsteps in one voting district. The narrowest role, and the one most people hold.',
  'compliance-officer':
    'answers data subject requests and corrects records. Holds no export and cannot change disclosure thresholds.',
  'finance-officer': 'records donations and manages disclosure thresholds. Holds nothing on the voter roll.',
};

const roleLine = (id: string): string => {
  const role = SEED_ROLES.find((r) => r.id === id)!;
  const purpose = ROLE_PURPOSE[id];
  if (!purpose) throw new Error(`SOP-02 has no description for role "${id}" — add one to ROLE_PURPOSE.`);
  const scope =
    role.geoScope === 'TENANT'
      ? 'whole tenant'
      : role.geoScope === 'MUNICIPALITY'
        ? 'whole municipality'
        : role.geoScope === 'WARD'
          ? 'one ward'
          : 'one voting district';
  return `${role.label} (${scope}) — ${purpose}`;
};

export const TENANT_SETUP_SOP: Sop = {
  number: 'SOP-02',
  title: 'Setting up a tenant and inviting your team',
  area: 'ONBOARDING',
  roles: ['party-hq-admin'],
  requiresAnyCapability: ['team.manage'],
  purpose:
    'How to take a new subscription from an empty tenant to a working campaign structure: record the ' +
    'municipality, get people signed in, give each of them the right role and the right patch of ground, ' +
    'and take access away again when someone leaves.',
  sections: [
    {
      heading: 'What a tenant is, and why it is the only boundary that matters',
      body: [
        'Your subscription is a tenant. Every record your campaign creates — voters, households, incidents, donations, documents — lives inside it, and nothing in this platform reads across from one tenant to another.',
        'That separation is enforced in three independent places: the token your browser holds after sign-in, the database security rules, and the code that builds every query. A request that satisfies one still has to satisfy the other two. You do not configure this and you cannot weaken it.',
        'What you do configure is who is inside your tenant and what each of them can reach. That is the whole of this procedure.',
      ],
    },
    {
      heading: 'Record the municipality first',
      body: [
        'Settings → Municipality Config. Do this before you add anyone, because the seat numbers recorded here are what the analytics read, and a team working against the wrong council size will not notice until a projection looks wrong.',
      ],
      steps: [
        'Enter the municipality code and name, and the province. The code is the IEC’s — NW405, CPT, JHB — not an internal reference.',
        'Enter the total council seats, the ward seats, and the PR seats. These come from the demarcation notice for your municipality, not from this platform, and nothing here will check them for you.',
        'Check the election date. A date is offered as a sensible default and is fully editable — it is a working assumption drawn from published reporting, not a figure this platform can confirm.',
        'Save. You can come back and correct any of it; nothing downstream is frozen by this step.',
      ],
      warnings: [
        'Only a Party HQ Admin can change this. If the page will not save, you are signed in as someone who does not hold the tenant settings permission — that is the permission model working, not a fault.',
      ],
    },
    {
      heading: 'How a person gets an account — they start, you finish',
      body: [
        'This platform does not create anyone’s sign-in account for them, and will not ask you for a colleague’s password. Each person creates their own account and then you give it a role. In that order.',
        'Tell the person to open the application and sign in — with Google, or with an email address and a password they choose. They will land on a screen headed "Awaiting access", because a new account belongs to no tenant and can see nothing at all.',
        'That screen shows them a sign-in ID. They send it to you. ' + SIGN_IN_ID_BASIS,
      ],
      warnings: [
        'Only the name, contact number, role and ward are held by this platform in South Africa. The sign-in account itself holds an email address and an identifier and nothing else — no name, no phone number, no ward. That is deliberate, because the sign-in service is the one component that operates outside the Republic.',
      ],
    },
    {
      heading: 'Add the person and give them their ground',
      body: [
        'Settings → Permissions → Add a person. Paste the sign-in ID they sent you, enter their name and a contact number, and choose their role.',
      ],
      steps: [
        'Paste the sign-in ID exactly as they sent it. If you paste an email address the form will tell you so — the two are different things and the mistake is a common one.',
        'Enter first name, last name and a contact number. A field team that cannot be reached is not a team.',
        'Choose the role. The form then asks for a ward code, or a voting district code, or neither — whichever that role actually uses.',
        'Add to the team. Their permissions are worked out on the server and written into their account; they may need to reload the application to pick them up.',
      ],
      warnings: [
        'The form refuses a ward or VD role saved without a code, and refuses a code on a role that has no geographic scope. Both refusals are there because the result is the same and it is silent: the person signs in successfully and sees an empty application, with nothing on screen to explain why.',
        'If someone reports that they can sign in but the application is empty, check their role and scope here first. It is almost always this.',
      ],
    },
    {
      heading: 'Choosing the role',
      body: [
        'There are seven roles. They are fixed — you cannot invent an eighth — and each carries a default set of permissions and a geographic reach.',
      ],
      steps: SEED_ROLES.map((role) => roleLine(role.id)),
      warnings: [
        'Give the narrowest role that lets someone do their job. A ward lead given a municipal role sees every ward in the municipality, and the platform will not ask whether you meant that.',
      ],
    },
    {
      heading: 'When the role is not quite right',
      body: [
        'A role can be adjusted for one person: Edit on their record lets you grant an extra permission or take one away. The result is the role’s defaults, plus what you granted, minus what you revoked.',
        'Use this sparingly and for a reason you could state out loud. A team where half the people carry adjustments is a team where nobody can answer the question "who can do this?" without opening seven records.',
      ],
      warnings: [
        'One concentration should be refused outright: no one person should be able to record what was donated, set the disclosure thresholds that decide what gets published about it, and answer the donor’s own data request. No default role holds all three. Two roles are kept apart on purpose for the same reason — the Compliance Officer cannot change disclosure thresholds, and the Finance Officer cannot answer data requests.',
        'An override can put any of that back together, and nothing in the platform will stop you. If you find yourself granting the third capability, that is the moment to stop and ask whether the campaign needs a second person instead.',
        'Permissions are not the only control. Donation and donor records cannot be deleted by anyone at all, at any permission level, and no role grants the ability to erase a voter record — see the compliance procedures.',
      ],
    },
    {
      heading: 'When someone leaves',
      body: [
        'Deactivate on their record. Their permissions are stripped from their account immediately, and the next time their application asks the server for anything, it is refused. Their record stays: it is not deleted, and neither is any work they did.',
      ],
      steps: [
        'Deactivate the person in Settings → Permissions as soon as they stop acting for the campaign.',
        'Ask for the device back if it belongs to the campaign, or ask them to sign out if it does not.',
        'If they held a ward or VD role, check that their doors are covered by someone else before the next round.',
      ],
      warnings: [
        'Deactivating is not a remote wipe. A phone that is already offline holds the records it downloaded and will keep showing them until it reconnects — and their current sign-in session may keep working until it next refreshes. For a device you cannot get back, treat the data on it as still out there and say so to whoever needs to know.',
      ],
    },
  ],
};
