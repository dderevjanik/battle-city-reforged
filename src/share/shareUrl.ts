import type { MapDto } from '../editor/types';

import { packMap, unpackMap } from './mapBinary';

const FORMAT_PREFIX = 'v1:';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64: string): Uint8Array {
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const std = b64.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(std);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deflate(input: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(input as BufferSource);
  writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

async function inflate(input: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(input as BufferSource);
  writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buf);
}

export async function encodeMapToHash(dto: MapDto): Promise<string> {
  const packed = packMap(dto);
  const bytes = typeof CompressionStream === 'undefined' ? packed : await deflate(packed);
  return FORMAT_PREFIX + bytesToBase64Url(bytes);
}

export async function decodeMapFromHash(hash: string): Promise<MapDto | null> {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const raw = params.get('m');
  if (!raw) return null;
  if (!raw.startsWith(FORMAT_PREFIX)) return null;
  const payload = raw.slice(FORMAT_PREFIX.length);

  try {
    const bytes = base64UrlToBytes(payload);
    let packed: Uint8Array;
    try {
      packed = await inflate(bytes);
    } catch {
      packed = bytes;
    }
    return unpackMap(packed);
  } catch (err) {
    console.warn('Failed to decode shared map hash:', err);
    return null;
  }
}
