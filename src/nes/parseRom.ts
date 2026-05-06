import { validateINes } from './header';

export interface NesRom {
  readonly bytes: Uint8Array;
}

export function parseRom(bytes: Uint8Array): NesRom {
  validateINes(bytes);
  return { bytes };
}
