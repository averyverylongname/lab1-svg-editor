import { SvgDocument } from "../model/SvgDocument.js";
import { SvgFileStore } from "../io/SvgFileStore.js";
import { History } from "./History.js";
import type { EditCommand } from "./commands/EditCommand.js";

/** 应用入口只组织文档生命周期、文件操作和历史，不计算图形几何。 */
export class Editor {
  private current?: SvgDocument;
  private filePath?: string;
  private readonly history = new History();
  constructor(private readonly files = new SvgFileStore()) {}

  get document(): SvgDocument {
    if (!this.current)
      throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }

  init(width = 800, height = 600): string {
    const document = new SvgDocument(width, height);
    this.current = document;
    this.filePath = undefined;
    this.history.barrier();
    return `canvas ${width}x${height} created`;
  }

  read(path: string): string {
    const { document, warnings } = this.files.read(path);
    this.current = document;
    this.filePath = path;
    this.history.barrier();
    return [...warnings, `read ${path} (${document.count} elements)`].join(
      "\n",
    );
  }

  save(path?: string): string {
    const document = this.document;
    const target = path ?? this.filePath;
    if (!target) throw new Error("no file path. use save <file.svg>");
    this.files.write(target, document);
    this.filePath = target;
    this.history.barrier();
    return `saved to ${target} (${document.count} elements)`;
  }

  canvas(width?: number, height?: number): string {
    const document = this.document;
    if (width !== undefined && height !== undefined) {
      document.resize(width, height);
      this.history.barrier();
    }
    return `canvas ${document.width}x${document.height}`;
  }

  execute(command: EditCommand): string {
    const result = this.history.execute(command, this.document);
    this.current = result.document;
    return result.message;
  }

  undo(): string {
    void this.document;
    const result = this.history.undo();
    this.current = result.document;
    return result.message;
  }

  redo(): string {
    void this.document;
    const result = this.history.redo();
    this.current = result.document;
    return result.message;
  }
}
