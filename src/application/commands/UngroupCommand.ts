import { EditCommand } from "./EditCommand.js";
import type { SvgDocument } from "../../model/SvgDocument.js";

export class UngroupCommand extends EditCommand {
  constructor(private readonly id: string) {
    super();
  }
  protected apply(document: SvgDocument): string {
    return `${document.ungroup(this.id).label} ungrouped`;
  }
}
