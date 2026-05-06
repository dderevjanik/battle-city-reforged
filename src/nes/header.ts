import { INES_HEADER_SIZE, ROM_FILE_SIZE } from './constants';

export class NesHeaderError extends Error {}

/**
 * Validates the iNES header against the canonical Battle City (J) ROM:
 * NROM-128, 16K PRG, 8K CHR, horizontal mirroring, no trainer.
 *
 * Throws NesHeaderError if the bytes do not match — many regional variants
 * and hacks have different mappers/sizes, and our offsets won't apply.
 */
export function validateINes(bytes: Uint8Array): void {
  if (bytes.length < INES_HEADER_SIZE) {
    throw new NesHeaderError(`File too short to be a NES ROM (${bytes.length} bytes)`);
  }
  if (bytes[0] !== 0x4e || bytes[1] !== 0x45 || bytes[2] !== 0x53 || bytes[3] !== 0x1a) {
    throw new NesHeaderError('Missing iNES magic — not a .nes file');
  }
  if (bytes[4] !== 0x01) {
    throw new NesHeaderError(`Expected 1 PRG bank (16 KiB); got ${bytes[4]}`);
  }
  if (bytes[5] !== 0x01) {
    throw new NesHeaderError(`Expected 1 CHR bank (8 KiB); got ${bytes[5]}`);
  }
  if ((bytes[6] & 0x0f) !== 0x00) {
    throw new NesHeaderError(`Unsupported flags6 low nibble: 0x${bytes[6].toString(16)}`);
  }
  if (bytes.length !== ROM_FILE_SIZE) {
    throw new NesHeaderError(
      `Unexpected ROM size: got ${bytes.length} bytes, expected ${ROM_FILE_SIZE}`,
    );
  }
}
