import { test } from 'node:test';
import assert from 'node:assert/strict';
import { satisfies, maxSatisfying, compare } from '../lib/semver.mjs';

test('caret ranges stay on the major', () => {
  assert.ok(satisfies('1.0.0', '^1.0.0'));
  assert.ok(satisfies('1.4.2', '^1.0.0'));
  assert.ok(!satisfies('2.0.0', '^1.0.0'));
  assert.ok(!satisfies('0.9.9', '^1.0.0'));
  assert.ok(satisfies('0.2.5', '^0.2.0'));
  assert.ok(!satisfies('0.3.0', '^0.2.0'));
});

test('tilde, comparators, wildcard and short forms', () => {
  assert.ok(satisfies('2.1.9', '~2.1.0'));
  assert.ok(!satisfies('2.2.0', '~2.1.0'));
  assert.ok(satisfies('1.5.0', '>=1.4'));
  assert.ok(satisfies('1.5.0', '>=1.0.0 <2.0.0'));
  assert.ok(!satisfies('2.0.0', '>=1.0.0 <2.0.0'));
  assert.ok(satisfies('3.0.0', '*'));
  assert.ok(satisfies('1.2.0', '^1.2'));
});

test('pre-releases only match explicit pre-release ranges', () => {
  assert.ok(!satisfies('1.1.0-rc.1', '^1.0.0'));
  assert.ok(satisfies('1.1.0-rc.1', '1.1.0-rc.1'));
  assert.ok(compare('1.1.0-rc.1', '1.1.0') < 0);
});

test('maxSatisfying picks the highest match', () => {
  assert.equal(maxSatisfying(['1.0.0', '1.1.0', '2.0.0'], '^1.0.0'), '1.1.0');
  assert.equal(maxSatisfying(['2.0.0'], '^1.0.0'), null);
});
