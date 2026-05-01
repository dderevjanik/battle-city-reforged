import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertNever } from './assertNever.ts';

describe('assertNever', () => {
  it('throws an Error including the offending value', () => {
    assert.throws(() => assertNever('unexpected' as never), {
      name: 'Error',
      message: /unexpected/,
    });
  });

  it('coerces non-string values into the message via template literal', () => {
    assert.throws(() => assertNever(42 as never), {
      message: /42/,
    });
    assert.throws(() => assertNever(null as never), {
      message: /null/,
    });
  });
});
