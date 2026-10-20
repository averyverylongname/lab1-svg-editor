import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../model/SvgDocument.js';

export class ReorderCommand extends EditCommand {
  constructor(private readonly id: string, private readonly front: boolean) { super(); }
  protected apply(document: SvgDocument): string {
    return `${document.reorder(this.id, this.front).label} moved to ${this.front ? 'front' : 'back'}`;
  }
}
