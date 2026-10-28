import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('website (server/site) is gebouwd uit de actuele banenlijst', () => {
  // Faalt als js/courses.js of tools/build-site.mjs gewijzigd is zonder: node tools/build-site.mjs
  assert.doesNotThrow(() => execFileSync('node', ['tools/build-site.mjs', '--check'], { stdio: 'pipe' }));
});
