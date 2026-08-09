import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tokens } from './tokens';

// Guards against tokens.ts and tailwind.config.js drifting apart. Tailwind's
// config loader can't consume .ts directly, so the two are hand-duplicated —
// this test is the only thing keeping that duplication honest.
describe('design tokens stay in sync with tailwind.config.js', () => {
  const configPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../tailwind.config.js',
  );
  const configSource = readFileSync(configPath, 'utf-8');

  it('every token colour appears in tailwind.config.js', () => {
    for (const hex of Object.values(tokens.color)) {
      expect(configSource).toContain(hex);
    }
  });

  it('every token font family appears in tailwind.config.js', () => {
    // tailwind.config.js splits the CSS font-family string into an array;
    // just check the family name survives verbatim.
    expect(configSource).toContain('Archivo Narrow');
    expect(configSource).toContain('Public Sans');
    expect(configSource).toContain('IBM Plex Mono');
  });

  it('does not contain retired Stitch drift colours', () => {
    const retired = ['#040c30', '#722226', '#1a253a', '#c0a062'];
    for (const hex of retired) {
      expect(Object.values(tokens.color)).not.toContain(hex);
    }
  });

  it('every declared type role has a matching fontSize entry in tailwind.config.js', () => {
    for (const role of tokens.typeRoles) {
      expect(configSource).toContain(`'${role}'`);
    }
  });
});
