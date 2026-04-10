import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Subject } from './Subject.ts';

describe('Subject', () => {
  it('should notify listeners with the event', () => {
    const subject = new Subject<number>();
    const received: number[] = [];
    subject.addListener((n) => received.push(n));

    subject.notify(42);
    assert.deepEqual(received, [42]);
  });

  it('should notify multiple listeners', () => {
    const subject = new Subject<string>();
    const a: string[] = [];
    const b: string[] = [];
    subject.addListener((s) => a.push(s));
    subject.addListener((s) => b.push(s));

    subject.notify('hello');
    assert.deepEqual(a, ['hello']);
    assert.deepEqual(b, ['hello']);
  });

  it('addListener should return an unsubscribe function', () => {
    const subject = new Subject<number>();
    const received: number[] = [];
    const unsub = subject.addListener((n) => received.push(n));

    subject.notify(1);
    unsub();
    subject.notify(2);

    assert.deepEqual(received, [1]);
  });

  it('removeListener should stop notifications', () => {
    const subject = new Subject<number>();
    const received: number[] = [];
    const listener = (n: number) => received.push(n);
    subject.addListener(listener);

    subject.notify(1);
    subject.removeListener(listener);
    subject.notify(2);

    assert.deepEqual(received, [1]);
  });

  it('removeListener on unknown listener should not throw', () => {
    const subject = new Subject<number>();
    subject.removeListener(() => {});
  });

  it('addListenerOnce should fire only once', () => {
    const subject = new Subject<number>();
    const received: number[] = [];
    subject.addListenerOnce((n) => received.push(n));

    subject.notify(1);
    subject.notify(2);
    subject.notify(3);

    assert.deepEqual(received, [1]);
  });

  it('once listener unsub should work before notify', () => {
    const subject = new Subject<number>();
    const received: number[] = [];
    const unsub = subject.addListenerOnce((n) => received.push(n));

    unsub();
    subject.notify(1);

    assert.deepEqual(received, []);
  });

  it('listener removing itself during notify should not skip others', () => {
    const subject = new Subject<number>();
    const order: string[] = [];
    let unsub: () => void;

    unsub = subject.addListener(() => {
      order.push('a');
      unsub();
    });
    subject.addListener(() => order.push('b'));

    subject.notify(1);
    assert.deepEqual(order, ['a', 'b']);

    // Second notify: 'a' was removed
    order.length = 0;
    subject.notify(2);
    assert.deepEqual(order, ['b']);
  });

  it('should handle void event type', () => {
    const subject = new Subject<void>();
    let called = false;
    subject.addListener(() => {
      called = true;
    });
    subject.notify(undefined);
    assert.equal(called, true);
  });
});
