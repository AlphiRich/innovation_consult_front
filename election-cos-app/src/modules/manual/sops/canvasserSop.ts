/**
 * Election Campaign OS — SOP-01, Canvassing a voting district
 *
 * The first SOP in the manual, and the one most people will ever read.
 * Its audience is the two roles that actually stand at gates.
 *
 * Every claim here is checked against the code in `sops.test.ts`. That is
 * not ceremony: this document grounds the operational statements the
 * Terms of Use and Privacy Policy will be drafted against, so a sentence
 * that overstates what the product does would propagate into a contract.
 * Where the product cannot do something, the SOP says so plainly rather
 * than describing an intention.
 */
import { NO_ANSWER_COOLOFF_HOURS, INACCESSIBLE_COOLOFF_HOURS } from '@/modules/voters/canvassQueue';
import { ACCESS_CODE_BASIS, SAFETY_NOTE_BASIS } from '@/modules/voters/householdSafety';
import type { Sop } from '../manualModel';

export const CANVASSER_SOP: Sop = {
  number: 'SOP-01',
  title: 'Canvassing a voting district',
  area: 'FIELD',
  roles: ['canvasser', 'vd-captain'],
  purpose:
    'How to work a doorstep round: what the app gives you before you knock, what you must say before ' +
    'you record anything, what to do when nobody answers, and how to leave the door in a state the ' +
    'next person can use.',
  sections: [
    {
      heading: 'Before you leave',
      steps: [
        'Open the app while you still have signal. The round you are about to work is downloaded to the phone — once you are out of coverage nothing new arrives.',
        'Check the queue shows the voting district you have actually been assigned. You will not be shown doors outside it; if the district is wrong, stop and tell your VD Captain rather than working the wrong streets.',
        'Do not open the app in private or incognito browsing. The phone stores your work locally, and private browsing prevents that — a shift logged in private mode can be lost entirely.',
        'Do not clear your browser history or site data while you have unsynced work. That is the one action that destroys a shift beyond recovery.',
      ],
      warnings: [
        'If the phone has unsynced work on it, treat it as the only copy. It is.',
      ],
    },
    {
      heading: 'Read the access note before you open the gate',
      body: [
        'Every household card can carry an access note written by whoever worked that door last. It is the first thing to read and it is there for your safety, not for record-keeping.',
        'The note lists hazards — a dog on the property, a locked gate, poor lighting, difficult access, an access code needed, or a hostile reception previously reported — and may carry a short instruction about how to approach.',
        'Where the note shows a dog, poor lighting, or a previously reported hostile reception, do not work that door alone. Take a partner or leave it for a paired round. The app marks these doors; it does not stop you, because only you can see the street you are standing in.',
        ACCESS_CODE_BASIS,
      ],
      warnings: [
        'A hazard note is a reason to pause, not a reason to force entry. If the gate is locked and there is no code, log it as "could not reach the door" and move on.',
      ],
    },
    {
      heading: 'Writing an access note for the next canvasser',
      body: [
        SAFETY_NOTE_BASIS,
        'Write about the property and the approach: "dog loose in the front yard", "knock at the side gate, front bell does not work", "no lighting past the driveway". The next person needs to know what to do.',
        'Do not write about the people who live there. A note that characterises a resident — what they are like, what they drink, how they behave — is a record about that person held by a political party. They are entitled to ask what is held about them and to have it corrected, and a note of that kind is what they would be shown.',
        'If something happened that genuinely affects the next canvasser\'s safety, record it as a hostile reception and keep the wording factual. "Shouted at, asked us to leave" is useful and defensible. "Aggressive man" is neither.',
      ],
      warnings: [
        'The app will prompt you if a note looks like it is describing a person. It is a prompt, not a refusal — read it and rewrite the note about the property.',
      ],
    },
    {
      heading: 'At the door: consent before anything is recorded',
      steps: [
        'Introduce yourself and say which campaign you are from.',
        'Explain what you would like to record and why, before you record it.',
        'Tell the person: their contact number is stored masked; their information is held in South Africa; they can ask what is held about them, ask for it to be corrected, and ask not to be contacted again.',
        'Only if they agree, mark consent given and capture the record. If they do not agree, do not capture anything about their views.',
      ],
      warnings: [
        'The app refuses to save a voter record without consent recorded. That refusal is the point of it — do not work around it by recording the household instead.',
        'Do not tell anyone their data will be deleted or purged after the election. This system suppresses records; it does not destroy or de-identify them, and promising otherwise is a promise the campaign cannot keep.',
      ],
    },
    {
      heading: 'Closing the door out',
      body: [
        'Every door ends in one of six states, and the state you leave decides whether the next round offers it to someone again.',
      ],
      steps: [
        'Contacted — you spoke to someone and captured what they agreed to. The door is done for this round.',
        'No answer — nobody came. The app offers it again after about ' + NO_ANSWER_COOLOFF_HOURS + ' hours, so an evening round picks up what a morning round missed.',
        'Could not reach the door — locked gate, boom, dog in the way. Offered again after about ' + INACCESSIBLE_COOLOFF_HOURS + ' hours, because the obstacle is usually still there sooner than that.',
        'Asked not to be contacted again — they told you not to come back. Record this and nothing else.',
        'In progress — you are standing there now. Leave it only if you are interrupted.',
        'Not contacted — untouched.',
      ],
      warnings: [
        'A door marked "asked not to be contacted again" is never offered to anyone again. That is deliberate and it cannot be undone from the field. Use it when someone asks, and do not use it for a door that merely went badly.',
      ],
    },
    {
      heading: 'Coming back into signal',
      body: [
        'When the phone finds a network, work already logged is sent up in the background. Keep the app open until it reports that the queue is clear.',
        'Nothing you logged is lost by going out of coverage. It is lost by clearing site data, or by a phone that is wiped before the queue drains.',
      ],
      steps: [
        'Return to an area with signal and leave the app open.',
        'Wait for the queue to report clear before closing it.',
        'If anything reports a conflict, hand the phone to your VD Captain rather than resolving it at the roadside.',
      ],
    },
  ],
};
