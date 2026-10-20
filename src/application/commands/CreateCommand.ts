import { EditCommand } from "./EditCommand.js";
import type { SvgDocument } from "../../model/SvgDocument.js";
import { ShapeFactory } from "../../model/ShapeFactory.js";

export class CreateCommand extends EditCommand {
  constructor(
    private readonly type: string,
    private readonly id: string,
    private readonly params: readonly string[],
    private readonly parentId?: string,
  ) {
    super();
  }
  protected apply(document: SvgDocument): string {
    const shape = new ShapeFactory().create(this.type, this.id, this.params);
    document.add(shape, this.parentId);
    return `${shape.label} created${this.parentId === undefined ? "" : ` in g#${this.parentId}`}`;
  }
}
