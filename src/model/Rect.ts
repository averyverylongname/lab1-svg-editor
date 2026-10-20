import { Shape } from './Shape.js';

export class Rect extends Shape {
  readonly type = 'rect';
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, { x, y, width, height });
  }
  move(dx: number, dy: number): void { this.moveCoordinates(dx, dy, ['x'], ['y']); }
  clone(): Rect { return this.copyStyles(new Rect(this.id, this.value('x'), this.value('y'), this.value('width'), this.value('height'))); }
  summary(): string {
    return `${this.label}  x=${this.value('x')} y=${this.value('y')} w=${this.value('width')} h=${this.value('height')}${this.styleSummary()}`;
  }
}
