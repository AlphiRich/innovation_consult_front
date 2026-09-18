/**
 * Election Campaign OS — SOP-12, Roles, permissions and what your
 * subscription includes
 *
 * The last SOP, and the one that explains the two questions every other
 * procedure quietly depends on: may this person do this, and did this
 * campaign buy this. They are different questions with different remedies,
 * and an administrator who conflates them will spend an afternoon widening
 * somebody's role to fix a problem that is a purchase.
 *
 * Writing it found that the product conflated them.
 *
 * **The entitlement gate was not wired in.** `src/auth/entitlements.ts`
 * exists, is tested, and says in its own header that "collapsing the two
 * into one 'access denied' is the failure this module exists to prevent".
 * Nothing in the application imported it. `resolveAccess`,
 * `activeModules` and `subscribedWards` were reached only by their own
 * test file. So a campaign that never bought the PPFA module saw the
 * Funding item in the nav, opened it, and used the whole donor ledger —
 * while `assembleManual()`, which does honour entitlements, printed that
 * same campaign a manual with SOP-10 withheld. Two shipped artifacts
 * disagreeing about the same fact.
 *
 * **A subscriber could not see what they had bought.** The records, the
 * port, the adapter and a security rule letting every tenant member read
 * them all existed; no screen did.
 *
 * **Per-user overrides could rebuild a separation of duty in silence.**
 * `roleModel.test.ts` asserts that no role holds the whole disclosure
 * chain plus the power to answer the donor's own data request. The
 * Permissions page offered every capability as a checkbox, and one tick on
 * a Compliance Officer assembled exactly that.
 *
 * All three ship with this SOP. The first draft of `dutyConcentration.ts`
 * also invented two separations this build does not hold, and its own
 * guard caught it against the seed roles — which is recorded here because
 * the failure mode matters: a warning that fires on a correct
 * configuration teaches an administrator to ignore warnings.
 */
import { CONCENTRATION_BASIS, ROLE_WITHHOLDINGS, SEPARATION_RULES } from '@/modules/settings/dutyConcentration';
import { SIGN_IN_ID_BASIS, SPLIT_VD_BASIS } from '@/modules/settings/staffProvisioning';
import { SUBSCRIPTION_PRICE_BASIS, UNBUILT_MODULE_BASIS } from '@/modules/settings/subscriptionView';
import type { Sop } from '../manualModel';

export const PERMISSIONS_SOP: Sop = {
  number: 'SOP-12',
  title: 'Roles, permissions and what your subscription includes',
  area: 'ADMINISTRATION',
  roles: ['party-hq-admin'],
  requiresAnyCapability: ['settings.permissions'],
  purpose:
    'The two gates every screen in this platform passes through: whether a person is permitted to do a thing, ' +
    'and whether the campaign bought the module it belongs to. How to tell them apart when somebody says a ' +
    'page is missing, how to grant and take away permissions, and what your subscription does and does not ' +
    'cover.',
  sections: [
    {
      heading: 'Two gates, and why telling them apart saves an afternoon',
      body: [
        'Every screen in this platform passes two checks. The first is permission: does this person\'s role include this. The second is subscription: did this campaign buy the module this belongs to.',
        'They fail for different reasons and they have different remedies. A permission problem you can fix yourself in a minute. A subscription problem no amount of permission-granting will touch — it is a purchase, and widening somebody\'s role to work around it does nothing except give them access they should not have to everything else that role covers.',
        'The platform now tells you which one you are looking at. When somebody says a page is missing, that answer is the first thing to establish.',
      ],
      warnings: [
        'The nav hides what a person cannot reach, which means an absent item is never an error message. If somebody tells you a section has vanished, check their role and check the subscription page before you assume anything is broken.',
        'Where the subscription cannot be read at all — a network failure, an offline phone — the platform falls back to permissions alone rather than locking everybody out. What a person can reach in that state may be wider than what was bought. It is a deliberate choice between two bad outcomes and the subscription page says so when it happens.',
      ],
    },
    {
      heading: 'The seven roles',
      body: [
        'Roles are fixed. This build does not offer tenant-defined roles, and the Permissions page shows the seven read-only with the capabilities each carries. That is not a limitation waiting to be lifted — a role a customer can define is a role nobody has reasoned about, and the separations below are the reasoning.',
        'Each role also carries a geographic scope: the whole tenant, a municipality, a ward, or a single voting district. Scope is not a permission. A Ward Lead with voters.view sees the voters in their ward and nobody else\'s, and no permission you grant changes that.',
      ],
      warnings: [
        'A role with a ward or voting-district scope and no code filled in is denied every record, and the screen will look empty rather than refused. The form will not let you save one, which is the only reason that is not a support call every week.',
        SPLIT_VD_BASIS,
      ],
    },
    {
      heading: 'Adding somebody',
      body: [
        'The order surprises people, so it is worth stating plainly: the person signs in first, and you add them second.',
        SIGN_IN_ID_BASIS,
      ],
      steps: [
        'Ask them to sign in. They will land on a screen saying they are awaiting access, showing their sign-in ID.',
        'Ask them to send you that ID exactly as shown.',
        'Settings → Permissions → Add a person. Paste the ID, fill in their name, contact number, role and scope.',
        'Ask them to sign out and back in. Their permissions are stamped into their sign-in when the record is saved, and an old session will not have them.',
      ],
      warnings: [
        'This platform cannot create anybody\'s sign-in account, and will not hold anybody\'s password. If a person cannot sign in, that is a sign-in problem, not a permissions problem, and nothing on this page will fix it.',
        'Deactivating somebody strips their access at the next token refresh, not instantly, and it is not a remote wipe. A phone already offline keeps what it downloaded. SOP-02 covers what that means for a device you cannot get back.',
      ],
    },
    {
      heading: 'Granting and taking away individual permissions',
      body: [
        'Beyond the role, you can grant a person a capability their role does not carry, or take away one it does. Both are recorded on their staff record, and the result is what the platform resolves into their sign-in.',
        'Use this sparingly. A campaign where half the staff carry overrides has a role model that no longer describes it, and nobody can answer "what can a Ward Lead do here" any more.',
      ],
      steps: [
        'Open the person and choose Edit.',
        'Tick what to add under granted, or what to remove under revoked.',
        'Read anything the screen warns you about before saving — see the next section.',
        'Save, and ask them to sign out and back in.',
      ],
      warnings: [
        'A revocation beats a grant. Ticking the same capability in both columns takes it away.',
        'Granting a capability does not buy a module. A person granted the PPFA capabilities in a campaign without the disclosure module still cannot open it, and the reason shown will say so.',
      ],
    },
    {
      heading: 'Separations of duty, and when the screen argues with you',
      body: [
        'Some combinations of permission put one person on both sides of a check that is meant to have two people in it. The roles are built to avoid them; overrides can rebuild them, and the screen now says so before you save.',
        'There is one combination no role holds and none should be given.',
      ],
      steps: SEPARATION_RULES.map((rule) => `${rule.label} — ${rule.reason}`),
      warnings: [
        CONCENTRATION_BASIS,
        'Two roles are also denied specific capabilities on purpose, and granting one of those is a departure from a decision somebody made deliberately rather than a breach of a general rule. The screen names which decision.',
        ...ROLE_WITHHOLDINGS.map((w) => w.reason),
      ],
    },
    {
      heading: 'What your subscription includes',
      body: [
        'Settings → Subscription lists every module, whether this campaign has it, and until when. Some are included in every subscription; the rest are bought, and two of them are bought ward by ward rather than for the whole campaign.',
        SUBSCRIPTION_PRICE_BASIS,
        UNBUILT_MODULE_BASIS,
      ],
      steps: [
        'Read which modules are on. The core platform — voter roll, wards, canvassing, incidents, logistics, war room — is always included.',
        'For a ward-bought module, read which wards. A ward that was not bought is off for that module and on for everything else.',
        'Read the dates. A module bought for a cycle stops at the end of that cycle, and the platform will say the term ended rather than pretending it was never bought.',
      ],
      warnings: [
        'Nobody inside a campaign can change a subscription, including you. Entitlements are written by Innovation Consult against an agreement, and the platform denies every client write to them — an administrator who could grant their own campaign a paid module would make the commercial model meaningless in the same way a client-side permission check would make the security model meaningless.',
        'Nothing on that page costs anything to look at and nothing on it charges anybody. It is a record of what was agreed, not a shop.',
      ],
    },
    {
      heading: 'What the permission model does not do',
      body: [
        'Worth knowing before somebody relies on it for something it was not built for.',
      ],
      steps: [
        'It does not log who looked at what. There is an audit trail for specific acts, not a record of every screen a person opened.',
        'It does not expire anybody. A volunteer who stops turning up keeps their access until somebody deactivates them, and nothing will remind you.',
        'It does not know about your party\'s structures. Roles here are what somebody does in this platform, not their standing in the organisation.',
        'It cannot make somebody see less within their scope. Permissions are per capability, not per record — a Ward Lead who may read their ward reads all of it.',
      ],
      warnings: [
        'Everything above is a rendering convenience until the platform checks it again on the server. Hiding a nav item is not security; the enforcement is in the database rules and the token, and it happens whether or not the screen agrees.',
      ],
    },
  ],
};
