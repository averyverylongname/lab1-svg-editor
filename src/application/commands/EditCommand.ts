import type { SvgDocument } from "../../model/SvgDocument.js";

export interface EditResult {
  document: SvgDocument;
  message: string;
}

/** Command + 快照：子类只描述一次编辑，不必各自实现复杂逆操作。 */
export abstract class EditCommand {
  private before?: SvgDocument;
  private after?: SvgDocument;
  private message = "";

  execute(document: SvgDocument): EditResult {
    // 在工作副本上执行，出错时不触碰当前文档与历史。
    const candidate = document.clone();
    const message = this.apply(candidate);
    this.before = document.clone();
    this.after = candidate.clone();
    this.message = message;
    return { document: candidate, message };
  }

  undo(): EditResult {
    if (!this.before) throw new Error("command has not been executed");
    return {
      document: this.before.clone(),
      message: `undone: ${this.message}`,
    };
  }

  redo(): EditResult {
    if (!this.after) throw new Error("command has not been executed");
    return { document: this.after.clone(), message: this.message };
  }

  protected abstract apply(document: SvgDocument): string;
}
