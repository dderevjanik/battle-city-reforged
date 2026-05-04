import { buildMapDto, loadDto } from './io';
import type { MapDto } from './types';

const KEY = 'bcr-editor-autosave-v1';
const DEBOUNCE_MS = 600;

interface AutosavePayload {
  savedAt: number;
  dto: MapDto;
}

let timer: number | null = null;

export function scheduleAutosave(): void {
  if (timer != null) clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    try {
      const payload: AutosavePayload = { savedAt: Date.now(), dto: buildMapDto() };
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Autosave failed:', e);
    }
  }, DEBOUNCE_MS);
}

export function readAutosave(): AutosavePayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutosavePayload;
    if (!parsed?.dto || typeof parsed.savedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(KEY);
}

function formatAgo(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** If a draft exists, prompt to restore. Returns true if a draft was loaded. */
export function tryRestoreAutosave(): boolean {
  const a = readAutosave();
  if (!a) return false;
  const when = formatAgo(Date.now() - a.savedAt);
  if (confirm(`Restore unsaved draft from ${when}?`)) {
    loadDto(a.dto);
    return true;
  }
  clearAutosave();
  return false;
}
