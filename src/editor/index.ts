import { setup, resizeCanvas, centerView, loadSprite, paintBrushSwatches, paintEnemyPreviews, render } from './renderer';
import { buildBrushList, buildEnemyRows, buildToolList, refreshSpawnLists } from './ui';
import { pushHistory } from './history';
import { bindViewport, bindKeyboard, bindToolbar, bindResize } from './events';
import { paintBaseDefense } from './io';

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

  loadSprite(() => {
    paintBrushSwatches();
    paintEnemyPreviews();
    render();
  });

  render();
}

init();
