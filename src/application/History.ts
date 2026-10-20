import type { SvgDocument } from "../model/SvgDocument.js";
import type { EditCommand, EditResult } from "./commands/EditCommand.js";

export class History {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private blocked = true;

  execute(command: EditCommand, document: SvgDocument): EditResult {
    const result = command.execute(document);
    this.undoStack.push(command);
    this.redoStack = [];
    this.blocked = false;
    return result;
  }

  undo(): EditResult {
    this.checkAllowed();
    const command = this.undoStack.at(-1);
    if (!command) throw new Error("nothing to undo");
    const result = command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
    return result;
  }

  redo(): EditResult {
    this.checkAllowed();
    const command = this.redoStack.at(-1);
    if (!command) throw new Error("nothing to redo");
    const result = command.redo();
    this.redoStack.pop();
    this.undoStack.push(command);
    return result;
  }

  barrier(): void {
    // 文件操作与画布重建之后，旧快照不再属于当前编辑阶段。
    this.undoStack = [];
    this.redoStack = [];
    this.blocked = true;
  }

  private checkAllowed(): void {
    if (this.blocked) throw new Error("undo not allowed after io command");
  }
}
