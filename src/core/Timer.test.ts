import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Timer } from './Timer.ts';

describe('Timer', () => {
  it('initializes inactive when constructed without a duration', () => {
    const timer = new Timer();
    assert.equal(timer.isActive(), false);
    assert.equal(timer.isDone(), true);
    assert.equal(timer.timeLeft, null);
  });

  it('initializes active when constructed with a duration', () => {
    const timer = new Timer(2);
    assert.equal(timer.isActive(), true);
    assert.equal(timer.isDone(), false);
    assert.equal(timer.timeLeft, 2);
  });

  it('decrements timeLeft on update while active', () => {
    const timer = new Timer(2);
    timer.update(0.5);
    assert.equal(timer.timeLeft, 1.5);
    timer.update(0.25);
    assert.equal(timer.timeLeft, 1.25);
  });

  it('completes and notifies when timeLeft drops below zero', () => {
    const timer = new Timer(1);
    let notified = 0;
    timer.done.addListener(() => {
      notified += 1;
    });

    timer.update(0.4);
    assert.equal(timer.isActive(), true);
    assert.equal(notified, 0);

    timer.update(0.7);
    assert.equal(timer.isDone(), true);
    assert.equal(timer.timeLeft, null);
    assert.equal(notified, 1);
  });

  it('does nothing when update is called on an inactive timer', () => {
    const timer = new Timer();
    let notified = 0;
    timer.done.addListener(() => {
      notified += 1;
    });

    timer.update(10);
    assert.equal(timer.isActive(), false);
    assert.equal(notified, 0);
  });

  it('does not notify a second time after completion', () => {
    const timer = new Timer(0.5);
    let notified = 0;
    timer.done.addListener(() => {
      notified += 1;
    });

    timer.update(1);
    timer.update(1);
    assert.equal(notified, 1);
  });

  it('reset() reactivates a completed timer', () => {
    const timer = new Timer(0.5);
    timer.update(1);
    assert.equal(timer.isDone(), true);

    timer.reset(2);
    assert.equal(timer.isActive(), true);
    assert.equal(timer.timeLeft, 2);
  });

  it('stop() makes an active timer inactive without notifying', () => {
    const timer = new Timer(5);
    let notified = 0;
    timer.done.addListener(() => {
      notified += 1;
    });

    timer.stop();
    assert.equal(timer.isActive(), false);
    assert.equal(notified, 0);
  });

  it('reset() and stop() return this for chaining', () => {
    const timer = new Timer();
    assert.equal(timer.reset(1), timer);
    assert.equal(timer.stop(), timer);
  });
});
