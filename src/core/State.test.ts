import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { State } from './State.ts';

describe('State', () => {
  it('should initialize with given value and null previousValue', () => {
    const state = new State(0);
    assert.equal(state.value, 0);
    assert.equal(state.previousValue, null);
  });

  it('get() should return current value', () => {
    const state = new State('hello');
    assert.equal(state.get(), 'hello');
  });

  it('set() should update value and track previous', () => {
    const state = new State(1);
    state.set(2);
    assert.equal(state.value, 2);
    assert.equal(state.previousValue, 1);
  });

  it('set() should return this for chaining', () => {
    const state = new State(1);
    const result = state.set(2);
    assert.equal(result, state);
  });

  it('update() should set previousValue to current value', () => {
    const state = new State(1);
    state.set(2);
    state.update();
    assert.equal(state.value, 2);
    assert.equal(state.previousValue, 2);
  });

  it('is() should return true when value matches', () => {
    const state = new State('active');
    assert.equal(state.is('active'), true);
    assert.equal(state.is('inactive'), false);
  });

  it('not() should return true when value does not match', () => {
    const state = new State('active');
    assert.equal(state.not('inactive'), true);
    assert.equal(state.not('active'), false);
  });

  it('hasChanged() should detect value change', () => {
    const state = new State(1);
    // previousValue is null, value is 1 → changed
    assert.equal(state.hasChanged(), true);

    state.update();
    // previousValue is 1, value is 1 → not changed
    assert.equal(state.hasChanged(), false);

    state.set(2);
    assert.equal(state.hasChanged(), true);
  });

  it('hasChangedTo() should detect change to specific value', () => {
    const state = new State(1);
    state.set(2);
    assert.equal(state.hasChangedTo(2), true);
    assert.equal(state.hasChangedTo(1), false);
  });

  it('hasChangedFrom() should detect change from specific value', () => {
    const state = new State(1);
    state.set(2);
    assert.equal(state.hasChangedFrom(1), true);
    assert.equal(state.hasChangedFrom(2), false);
  });

  it('hasChangedFromTo() should detect specific transition', () => {
    const state = new State(1);
    state.set(2);
    assert.equal(state.hasChangedFromTo(1, 2), true);
    assert.equal(state.hasChangedFromTo(2, 1), false);
    assert.equal(state.hasChangedFromTo(1, 3), false);
  });

  it('should work with distinct constant values', () => {
    const Playing = 0;
    const Paused = 1;
    const state = new State(Playing);
    state.set(Paused);
    assert.equal(state.is(Paused), true);
    assert.equal(state.hasChangedFromTo(Playing, Paused), true);
  });
});
