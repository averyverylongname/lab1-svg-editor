import { Shape } from './Shape.js';
import type { SvgNode } from './SvgNode.js';

export class Text extends Shape {
  readonly type = 'text';
  private content: string;
  constructor(id: string, x: number, y: number, content: string) {
    super(id, { x, y });
    this.content = content;
  }
  move(dx: number, dy: number): void { this.moveCoordinates(dx, dy, ['x'], ['y']); }
  clone(): Text { return this.copyStyles(new Text(this.id, this.value('x'), this.value('y'), this.content)); }
  override setAttribute(name: string, value: string): void {
    if (name === 'text') this.content = value;
    else super.setAttribute(name, value);
  }
  override toSvgNode(): SvgNode { return { ...super.toSvgNode(), text: this.content }; }
  summary(): string { return `${this.label}  (${this.value('x')},${this.value('y')}) ${JSON.stringify(this.content)}${this.styleSummary()}`; }
}
