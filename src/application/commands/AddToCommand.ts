import { EditCommand } from './EditCommand.js';
import type { SvgDocument } from '../../model/SvgDocument.js';

export class AddToCommand extends EditCommand {
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected apply(document: SvgDocument): string {
    document.addTo(this.groupId, this.id);
    return `${document.find(this.id).label} moved into g#${this.groupId}`;
  }
}
