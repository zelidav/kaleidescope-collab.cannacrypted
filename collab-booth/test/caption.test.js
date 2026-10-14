import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCaption, cleanHandle, fillHandle, isValidHandle, sanitizeAiCaption } from '../shared/caption.js';

const TEMPLATE = '{ai_caption}\n\n📍 The B*NG Garden by @jeromebakerdesigns at @hallofflowers NYC\n{hashtags}';
const TAGS = '#HallOfFlowers #JeromeBaker #BNGGarden #GlassArt #HandBlownGlass';

test('replaces {handle} with @handle', () => {
  assert.equal(fillHandle('Fresh-picked: {handle} in full bloom 🌷', 'jane.doe'), 'Fresh-picked: @jane.doe in full bloom 🌷');
});

test('prepends @handle when the AI forgot the placeholder', () => {
  assert.equal(fillHandle('A glass act in the garden!', 'jane'), '@jane A glass act in the garden!');
});

test('empty AI caption falls back to just the template', () => {
  const out = buildCaption({ template: TEMPLATE, aiCaption: '', handle: 'jane', hashtags: TAGS });
  assert.equal(out, `@jane\n\n📍 The B*NG Garden by @jeromebakerdesigns at @hallofflowers NYC\n${TAGS}`);
});

test('default template renders exactly as specified', () => {
  const out = buildCaption({ template: TEMPLATE, aiCaption: 'Look who’s blooming: {handle}!', handle: 'jb', hashtags: TAGS });
  assert.equal(
    out,
    'Look who’s blooming: @jb!\n\n📍 The B*NG Garden by @jeromebakerdesigns at @hallofflowers NYC\n#HallOfFlowers #JeromeBaker #BNGGarden #GlassArt #HandBlownGlass',
  );
});

test('handle cleaning and validation', () => {
  assert.equal(cleanHandle('  @Jane.Doe '), 'jane.doe');
  assert.equal(cleanHandle('https://www.instagram.com/jane_doe/?hl=en'), 'jane_doe');
  assert.ok(isValidHandle('jane_doe.99'));
  assert.ok(!isValidHandle('jane..doe'));
  assert.ok(!isValidHandle('.jane'));
  assert.ok(!isValidHandle('jane.'));
  assert.ok(!isValidHandle('jane-doe'));
  assert.ok(!isValidHandle('a'.repeat(31)));
  assert.ok(!isValidHandle(''));
});

test('sanitizes model output', () => {
  assert.equal(sanitizeAiCaption('"Welcome to the bong garden, @{Handle}! #glass"'), 'Welcome to the B*NG garden, {handle}!');
  assert.equal(sanitizeAiCaption('Caption: Two bongs and {handle}\nin full bloom'), 'Two B*NGs and {handle} in full bloom');
});
