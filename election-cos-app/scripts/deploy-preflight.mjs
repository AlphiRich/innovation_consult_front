#!/usr/bin/env node
/**
 * Election Campaign OS — deploy preflight
 * IC-ECOS-BUILD-2026-V2 §1, §0 rule 1 (africa-south1 everywhere).
 *
 * WHY THIS EXISTS
 *
 * `firebase deploy` on this project would be the first time anything in
 * this build touched a live Firestore. The failure modes are not build
 * failures — they are a successful deploy of the wrong thing:
 *
 *   - Hosting published from a stale `dist/` built before the last change.
 *   - Rules deployed while `.env` still points at no project, so the app
 *     that loads has no backend.
 *   - Functions deployed into `us-central1` because one of them forgot to
 *     pin `REGION`, splitting the app across continents and breaking the
 *     data-residency rule this spec opens with.
 *   - A deploy that silently did nothing because no credential was
 *     present, reported as success by a wrapper script.
 *
 * So this runs first, checks the things that are checkable without a
 * network, and exits non-zero with a sentence an operator can act on. It
 * never deploys anything itself and it never says a deploy happened.
 *
 * WHAT IT CANNOT CHECK
 *
 * Whether Firestore and Storage were actually created in africa-south1.
 * That is set at resource-creation time, is not expressible in
 * `firebase.json`, and cannot be read without authenticating. It is the
 * one item this script can only remind a person to verify in the console
 * — and it is irreversible once data exists, which is why the reminder is
 * loud rather than a comment.
 *
 * USAGE
 *
 *   node scripts/deploy-preflight.mjs            # check, report, exit 0/1
 *   node scripts/deploy-preflight.mjs --json     # machine-readable
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const json = process.argv.includes('--json');

/** The region rule 1 of §0 fixes for every resource in this product. */
const REQUIRED_REGION = 'africa-south1';

const checks = [];
const add = (name, status, detail, remedy) => checks.push({ name, status, detail, remedy });
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ---------------------------------------------------------------- project

try {
  const rc = JSON.parse(read('.firebaserc'));
  const project = rc.projects?.default;
  if (!project || /example|your-project|CHANGEME/i.test(project)) {
    add('project id', 'FAIL', `.firebaserc default is ${project ?? 'absent'}`,
      'Set projects.default in .firebaserc to the real Firebase project id.');
  } else {
    add('project id', 'PASS', project);
  }
} catch (error) {
  add('project id', 'FAIL', `.firebaserc unreadable: ${error.message}`, 'Create .firebaserc from .firebaserc.example.');
}

// ------------------------------------------------------------ credentials

// The only two non-interactive credentials the Firebase CLI accepts. A
// deploy without one of them does not fail loudly — it opens a browser
// that nobody is looking at, and then times out.
const credential =
  (process.env.GOOGLE_APPLICATION_CREDENTIALS && 'GOOGLE_APPLICATION_CREDENTIALS') ||
  (process.env.FIREBASE_TOKEN && 'FIREBASE_TOKEN') ||
  null;

if (!credential) {
  add('deploy credential', 'FAIL', 'neither GOOGLE_APPLICATION_CREDENTIALS nor FIREBASE_TOKEN is set',
    'Add a service-account JSON path as GOOGLE_APPLICATION_CREDENTIALS, or a CI token as FIREBASE_TOKEN, ' +
    'to the environment. Deployment cannot proceed without one.');
} else if (credential === 'GOOGLE_APPLICATION_CREDENTIALS') {
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!existsSync(file)) {
    add('deploy credential', 'FAIL', `GOOGLE_APPLICATION_CREDENTIALS points at ${file}, which does not exist`,
      'Point it at the service-account JSON file.');
  } else {
    let who = 'unreadable';
    try {
      const sa = JSON.parse(readFileSync(file, 'utf8'));
      who = sa.client_email ?? 'no client_email';
    } catch {
      /* reported as unreadable below */
    }
    add('deploy credential', who === 'unreadable' ? 'FAIL' : 'PASS', `service account: ${who}`,
      who === 'unreadable' ? 'The file is not valid JSON.' : undefined);
  }
} else {
  add('deploy credential', 'PASS', 'FIREBASE_TOKEN is set');
}

// -------------------------------------------------------------- web config

// Hosting can deploy perfectly and serve an app that cannot reach a
// backend, because the Firebase web config is baked in at build time.
const WEB_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];
const envFile = existsSync(path.join(ROOT, '.env')) ? read('.env') : '';
const readVar = (key) => {
  if (process.env[key]) return process.env[key];
  return new RegExp(`^${key}=(.+)$`, 'm').exec(envFile)?.[1]?.trim() ?? '';
};
const missingWeb = WEB_VARS.filter((key) => readVar(key) === '');

if (missingWeb.length > 0) {
  add('web app config', 'FAIL', `${missingWeb.length} of ${WEB_VARS.length} missing: ${missingWeb.join(', ')}`,
    'Register a Web App in the Firebase console and copy its config into .env (see .env.example). ' +
    'Without these the deployed site loads and can reach no backend at all.');
} else {
  // Present is not the same as correct. A developer running against the
  // emulator has six well-formed values for `demo-ecos` in .env, and
  // deploying that build would publish a site whose every request goes
  // to a project that does not exist. The config's own project id has to
  // match the project being deployed to.
  const configProject = readVar('VITE_FIREBASE_PROJECT_ID');
  const deployProject = (() => {
    try {
      return JSON.parse(read('.firebaserc')).projects?.default ?? '';
    } catch {
      return '';
    }
  })();

  if (readVar('VITE_FIREBASE_USE_EMULATORS') === 'true') {
    add('web app config', 'FAIL', 'VITE_FIREBASE_USE_EMULATORS is true in .env',
      'This .env points the app at the local emulator suite. Unset it before deploying, or the build ' +
      'you publish is a development build.');
  } else if (deployProject && configProject !== deployProject) {
    add('web app config', 'FAIL', `config is for ${configProject}, deploying to ${deployProject}`,
      'The web config compiled into the bundle names a different project than the one being deployed to. ' +
      'The site would publish successfully and reach nothing.');
  } else {
    add('web app config', 'PASS', `all ${WEB_VARS.length} present, project ${configProject}`);
  }

  // ------------------------------------------------------- auth domain
  //
  // Added when electioscos.co.za was registered, because there is a
  // tempting and expensive mistake available here.
  //
  // `authDomain` is where the Google OAuth handshake happens, served from
  // `/__/auth/*`. Firebase Hosting serves those paths on a custom domain
  // too, so pointing authDomain at electioscos.co.za is legitimate and
  // better product — a party official signing in sees the campaign's own
  // domain rather than election2026-campaignms7-0.firebaseapp.com.
  //
  // But it only works AFTER the custom domain is connected and its
  // certificate issued. Set it first and sign-in fails for everybody,
  // with a redirect to a host that is not yet serving the auth helpers —
  // and sign-in is the one failure that locks out the people who would
  // otherwise fix it.
  //
  // So: not a FAIL, because it is a correct end state. A loud WARN with
  // the ordering, because getting the order wrong takes the whole
  // product down.
  const authDomain = readVar('VITE_FIREBASE_AUTH_DOMAIN');
  const firebaseDefaults = [`${configProject}.firebaseapp.com`, `${configProject}.web.app`];

  if (authDomain && !firebaseDefaults.includes(authDomain)) {
    add('auth domain', 'WARN', `custom: ${authDomain}`,
      `This only works once ${authDomain} is connected to Firebase Hosting on ${configProject} with its ` +
      'certificate issued, AND is listed under Authentication -> Settings -> Authorised domains. If it is ' +
      `not, every sign-in fails. Until then use ${firebaseDefaults[0]}.`);
  } else if (authDomain) {
    add('auth domain', 'PASS', `${authDomain} (Firebase default)`);
  }
}

// ----------------------------------------------------------------- build

const dist = path.join(ROOT, 'dist');
if (!existsSync(dist) || !existsSync(path.join(dist, 'index.html'))) {
  add('build output', 'FAIL', 'dist/index.html is absent', 'Run npm run build.');
} else {
  // A dist older than the newest source file is the stale-deploy failure.
  const newestSource = (() => {
    let newest = 0;
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else newest = Math.max(newest, statSync(full).mtimeMs);
      }
    };
    walk(path.join(ROOT, 'src'));
    return newest;
  })();
  const built = statSync(path.join(dist, 'index.html')).mtimeMs;
  if (built < newestSource) {
    add('build output', 'FAIL', 'dist is older than src', 'Run npm run build — the current dist would publish stale code.');
  } else {
    add('build output', 'PASS', 'dist is newer than src');
  }
}

// ---------------------------------------------------------- function region

// Every exported function must carry the region. One that does not lands
// in us-central1, which breaks the residency rule silently.
try {
  const functionsDir = path.join(ROOT, 'functions', 'src');
  const sources = readdirSync(functionsDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
  const regionModule = read(path.join('functions', 'src', 'region.ts'));
  const declared = /['"]([a-z0-9-]+)['"]/.exec(regionModule)?.[1];
  const unpinned = sources
    .filter((file) => file !== 'region.ts' && file !== 'index.ts')
    .filter((file) => {
      const body = readFileSync(path.join(functionsDir, file), 'utf8');
      const exportsFunction = /export const \w+ = on[A-Z]/.test(body);
      return exportsFunction && !/region:\s*REGION/.test(body);
    });

  if (declared !== REQUIRED_REGION) {
    add('function region', 'FAIL', `functions/src/region.ts declares ${declared}`,
      `Rule 1 of §0 fixes every resource at ${REQUIRED_REGION}.`);
  } else if (unpinned.length > 0) {
    add('function region', 'FAIL', `not pinned to REGION: ${unpinned.join(', ')}`,
      'Every onRequest/onCall/onDocument export must pass region: REGION, or it deploys to us-central1.');
  } else {
    add('function region', 'PASS', `${declared}, pinned in every function`);
  }
} catch (error) {
  add('function region', 'FAIL', `could not check: ${error.message}`);
}

// --------------------------------------------------- functions readiness

// Not every unfinished function is dangerous, and conflating the two
// either blocks a safe deploy or waves through an unsafe one. The
// distinction is whether the function can do the wrong thing:
//
//   @deployable yes          — finished.
//   @deployable fails-closed — cannot do its job, refuses instead. There
//                              is no path through it that returns a
//                              value, so shipping it is safe.
//   @deployable no           — a half-written path that can write. Never
//                              deploy.
//
// A function with no marker is treated as unreviewed and fails, because
// the default for "nobody has said" must not be "ship it".
try {
  const functionsDir = path.join(ROOT, 'functions', 'src');
  const exported = read(path.join('functions', 'src', 'index.ts'));
  const sources = readdirSync(functionsDir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .filter((f) => f !== 'region.ts' && f !== 'index.ts');

  const unmarked = [];
  const blocked = [];
  const failsClosed = [];

  for (const file of sources) {
    const body = readFileSync(path.join(functionsDir, file), 'utf8');
    if (!/export const \w+ = on[A-Z]/.test(body)) continue;
    // Only functions actually wired into index.ts can be deployed.
    const names = [...body.matchAll(/export const (\w+) = on[A-Z]/g)].map((m) => m[1]);
    if (!names.some((name) => new RegExp(`\\b${name}\\b`).test(exported))) continue;

    const marker = /@deployable\s+(yes|no|fails-closed)/.exec(body)?.[1];
    if (!marker) unmarked.push(file);
    else if (marker === 'no') blocked.push(file);
    else if (marker === 'fails-closed') failsClosed.push(file);
  }

  if (blocked.length > 0) {
    add('functions readiness', 'FAIL', `${blocked.join(', ')} is marked @deployable no`,
      'Finish the module or remove it from functions/src/index.ts before deploying.');
  } else if (unmarked.length > 0) {
    add('functions readiness', 'FAIL', `no @deployable marker: ${unmarked.join(', ')}`,
      'Add @deployable yes / fails-closed / no to the file header. Unreviewed must not mean shippable.');
  } else {
    const note = failsClosed.length > 0 ? `, ${failsClosed.length} fails-closed pending infra` : '';
    add('functions readiness', 'PASS', `${sources.length} reviewed${note}`);
  }
} catch (error) {
  add('functions readiness', 'FAIL', `could not check: ${error.message}`);
}

// ------------------------------------------------- functions are compiled

// `functions/package.json` points `main` at `lib/index.js`, which only
// exists after tsc has run. Without a predeploy hook the CLI uploads a
// package whose entry point is absent — the deploy reports success and
// every function is dead on arrival. This was the state of firebase.json
// until session 41.
try {
  const firebaseJson = JSON.parse(read('firebase.json'));
  const codebases = Array.isArray(firebaseJson.functions)
    ? firebaseJson.functions
    : firebaseJson.functions
      ? [firebaseJson.functions]
      : [];

  const problems = [];
  for (const codebase of codebases) {
    const dir = codebase.source ?? 'functions';
    const pkgPath = path.join(ROOT, dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const entry = pkg.main ?? 'index.js';
    const compiled = !existsSync(path.join(ROOT, dir, entry));
    const hasHook = Array.isArray(codebase.predeploy) && codebase.predeploy.length > 0;
    if (compiled && !hasHook) {
      problems.push(`${dir}: main is ${entry}, which is absent, and there is no predeploy hook to build it`);
    }
  }

  if (codebases.length === 0) {
    add('functions build', 'PASS', 'no functions codebase declared');
  } else if (problems.length > 0) {
    add('functions build', 'FAIL', problems.join('; '),
      'Add a predeploy hook that runs the build, or the deploy succeeds and every function is dead on arrival.');
  } else {
    add('functions build', 'PASS', `${codebases.length} codebase(s) build before deploy`);
  }
} catch (error) {
  add('functions build', 'FAIL', `could not check: ${error.message}`);
}

// --------------------------------------------------------------- rules

for (const [name, file] of [['firestore rules', 'firestore.rules'], ['storage rules', 'storage.rules']]) {
  if (!existsSync(path.join(ROOT, file))) {
    add(name, 'FAIL', `${file} is absent`);
    continue;
  }
  const body = read(file);
  // An allow-all rule in a tenanted product is the one deploy that cannot
  // be walked back: it is public for as long as it is live.
  if (/allow\s+read,\s*write:\s*if\s+true/.test(body)) {
    add(name, 'FAIL', `${file} contains an allow-all rule`, 'Never deploy this. It makes every tenant readable by anyone.');
  } else {
    add(name, 'PASS', `${file} present, no allow-all rule`);
  }
}

// ------------------------------------------------------------- reporting

const failures = checks.filter((c) => c.status === 'FAIL');
// WARN is a third state, added with the custom domain: a configuration
// that is correct as an end state but breaks the product if reached in
// the wrong order. It must not block a deploy — the end state is the
// goal — and it must not print as "FAIL" either, or the one thing the
// reader needs to distinguish is the thing the output hides.
const warnings = checks.filter((c) => c.status === 'WARN');

if (json) {
  console.log(
    JSON.stringify(
      { ready: failures.length === 0, warnings: warnings.length, region: REQUIRED_REGION, checks },
      null,
      2,
    ),
  );
} else {
  console.log('\nElection Campaign OS — deploy preflight\n');
  for (const check of checks) {
    const mark = check.status === 'PASS' ? 'ok  ' : check.status === 'WARN' ? 'warn' : 'FAIL';
    console.log(`  ${mark}  ${check.name.padEnd(22)} ${check.detail}`);
    if (check.remedy && check.status !== 'PASS') console.log(`        -> ${check.remedy}`);
  }
  console.log();
  if (failures.length === 0) {
    const tail = warnings.length === 1 ? '' : 's';
    console.log(
      warnings.length === 0
        ? '  All preflight checks pass. Nothing has been deployed — this script only checks.'
        : `  Preflight passes with ${warnings.length} warning${tail}. Nothing has been deployed — this script only checks.`,
    );
    console.log(`\n  BEFORE THE FIRST DEPLOY, verify in the console that Firestore and Storage were created`);
    console.log(`  in ${REQUIRED_REGION}. It is set at creation time, cannot be read from here, and cannot`);
    console.log('  be changed once data exists.\n');
  } else {
    console.log(`  ${failures.length} check(s) failed. Not ready to deploy.\n`);
  }
}

process.exit(failures.length === 0 ? 0 : 1);
