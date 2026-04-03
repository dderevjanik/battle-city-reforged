export {};

declare global {
  type NativeCanvas = HTMLCanvasElement | OffscreenCanvas;

  type NativeContext =
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
}
