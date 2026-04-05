import { setup, resizeCanvas, centerView, loadSprite, paintBrushSwatches, render } from './renderer';
import { buildBrushList, buildEnemyRows, refreshSpawnLists } from './ui';
import { pushHistory } from './history';
import { bindViewport, bindKeyboard, bindToolbar, bindResize } from './events';

function init(): void {
  const canvas   = document.getElementById('canvas')   as HTMLCanvasElement;
  const viewport = document.getElementById('viewport') as HTMLElement;

  setup(canvas, viewport);
  resizeCanvas();

  buildBrushList();
  buildEnemyRows();
  refreshSpawnLists();
  bindToolbar();
  bindViewport(viewport);
  bindKeyboard();
  bindResize();

  centerView();
  pushHistory();

  loadSprite(() => {
    paintBrushSwatches();
    render();
  });

  render();
}

init();
