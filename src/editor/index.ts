import { setup, resizeCanvas, centerView, loadSprite, paintBrushSwatches, paintEnemyPreviews, render } from './renderer';
import { buildBrushList, buildEnemyRows, buildToolList, refreshSpawnLists } from './ui';
import { pushHistory, setHistoryListener } from './history';
import { bindViewport, bindKeyboard, bindToolbar, bindResize } from './events';
import { paintBaseDefense } from './io';
import { scheduleAutosave, tryRestoreAutosave } from './autosave';

function init(): void {
  const canvas   = document.getElementById('canvas')   as HTMLCanvasElement;
  const viewport = document.getElementById('viewport') as HTMLElement;

  setup(canvas, viewport);
  resizeCanvas();

  buildToolList();
  buildBrushList();
  buildEnemyRows();
  refreshSpawnLists();
  bindToolbar();
  bindViewport(viewport);
  bindKeyboard();
  bindResize();

  paintBaseDefense();
  centerView();
  pushHistory();

  // Offer to restore an autosaved draft from the previous session.
  // Run after the initial pushHistory so we don't autosave the default state,
  // and before installing the listener so the restore's own pushHistory doesn't
  // immediately overwrite the saved draft until the user makes a real change.
  tryRestoreAutosave();
  setHistoryListener(scheduleAutosave);

  loadSprite(() => {
    paintBrushSwatches();
    paintEnemyPreviews();
    render();
  });

  render();
}

init();
