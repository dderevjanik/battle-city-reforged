import { ProgressContext } from './ProgressContext';
import { RenderContext } from './RenderContext';
import { RuntimeContext } from './RuntimeContext';

export type { ProgressContext } from './ProgressContext';
export type { RenderContext } from './RenderContext';
export type { RuntimeContext } from './RuntimeContext';

/**
 * Composite of all long-lived game services, created once and passed to setup().
 * Prefer depending on one of the three slices (RenderContext, RuntimeContext,
 * ProgressContext) when a scene or behavior only needs a subset.
 *
 * For per-frame data (deltaTime), use the update(deltaTime) parameter directly.
 */
export interface GameContext extends RenderContext, RuntimeContext, ProgressContext {}
