import { Subject } from '../Subject';

export interface FileOpenerOptions {
  multiple?: boolean;
}

const DEFAULT_OPTIONS: FileOpenerOptions = {
  multiple: false,
};

export class FileOpener {
  public opened = new Subject<globalThis.FileList>();
  private options: FileOpenerOptions;
  private fileElement: HTMLInputElement;

  constructor(options: FileOpenerOptions = {}) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);

    this.fileElement = document.createElement('input');
    this.fileElement.addEventListener('change', this.handleFileChange);
    this.fileElement.setAttribute('type', 'file');
    this.fileElement.setAttribute('multiple', (this.options.multiple ?? false).toString());
  }

  public openDialog(): void {
    this.fileElement.click();
  }

  private handleFileChange = (): void => {
    const { files } = this.fileElement;

    if (files === null || files.length === 0) {
      return;
    }

    this.opened.notify(files);
  };
}

export class FileSaver {
  public saveJSON(json: string, fileName = 'file.json'): void {
    const jsonEncoded = window.encodeURIComponent(json);

    const dataStr = `data:text/json;charset=utf-8,${jsonEncoded}`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataStr);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  }
}
