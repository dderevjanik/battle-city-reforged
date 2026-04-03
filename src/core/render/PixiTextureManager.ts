import * as PIXI from 'pixi.js';

interface SpriteManifestItem {
  file: string;
  rect: number[];
}

interface SpriteManifest {
  [id: string]: SpriteManifestItem;
}

export class PixiTextureManager {
  private readonly manifest: SpriteManifest;
  private readonly baseTextures = new Map<string, PIXI.BaseTexture>();
  private readonly textures = new Map<string, PIXI.Texture>();

  constructor(manifest: SpriteManifest) {
    this.manifest = manifest;
  }

  public async preload(): Promise<void> {
    // Collect unique image file paths
    const files = new Set<string>();
    for (const item of Object.values(this.manifest)) {
      files.add(item.file);
    }

    // Load each base texture
    for (const file of files) {
      const baseTexture = PIXI.BaseTexture.from(file, {
        scaleMode: PIXI.SCALE_MODES.NEAREST,
      });

      this.baseTextures.set(file, baseTexture);

      // Wait for loading if not yet ready
      if (!baseTexture.valid) {
        await new Promise<void>((resolve, reject) => {
          baseTexture.once('loaded', () => resolve());
          baseTexture.once('error', () =>
            reject(new Error(`Failed to load texture: ${file}`)),
          );
        });
      }
    }

    // Create a PIXI.Texture for each sprite ID
    for (const [id, item] of Object.entries(this.manifest)) {
      const baseTexture = this.baseTextures.get(item.file);
      const [x, y, w, h] = item.rect;
      const frame = new PIXI.Rectangle(x, y, w, h);
      const texture = new PIXI.Texture(baseTexture, frame);
      this.textures.set(id, texture);
    }
  }

  public get(id: string): PIXI.Texture {
    const texture = this.textures.get(id);
    if (texture === undefined) {
      throw new Error(`Unknown texture id: "${id}"`);
    }
    return texture;
  }

  public has(id: string): boolean {
    return this.textures.has(id);
  }

  /**
   * Create a PIXI.Texture from an HTML canvas element.
   * Used for dynamically generated textures (e.g. colored sprite fonts).
   */
  public fromCanvas(canvas: HTMLCanvasElement, id?: string): PIXI.Texture {
    const texture = PIXI.Texture.from(canvas, {
      scaleMode: PIXI.SCALE_MODES.NEAREST,
    });
    if (id !== undefined) {
      this.textures.set(id, texture);
    }
    return texture;
  }
}
