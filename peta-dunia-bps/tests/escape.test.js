import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/ui/escape.js';

describe('escapeHtml (names rendered into innerHTML)', () => {
  it('escapes tags so they render as text', () => {
    assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes quotes so a name cannot leave an attribute', () => {
    assert.equal(escapeHtml('Uji" onmouseover="alert(1)'), 'Uji&quot; onmouseover=&quot;alert(1)');
    assert.equal(escapeHtml("O'Brien"), 'O&#039;Brien');
  });

  it('escapes ampersands first and keeps normal names unchanged', () => {
    assert.equal(escapeHtml('A & B'), 'A &amp; B');
    assert.equal(escapeHtml('&lt;'), '&amp;lt;');
    assert.equal(escapeHtml('Budi Santoso'), 'Budi Santoso');
  });

  it('returns an empty string for non-string input', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(42), '');
  });
});
