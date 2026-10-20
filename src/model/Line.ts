import { Shape } from './Shape.js';

export class Line extends Shape {
  readonly type = 'line';
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) { super(id, { x1, y1, x2, y2 }); }
  move(dx: number, dy: number): void { this.moveCoordinates(dx, dy, ['x1', 'x2'], ['y1', 'y2']); }
  clone(): Line { return this.copyStyles(new Line(this.id, this.value('x1'), this.value('y1'), this.value('x2'), this.value('y2'))); }
  summary(): string {
    return `${this.label}  (${this.value('x1')},${this.value('y1')}) -> (${this.value('x2')},${this.value('y2')})${this.styleSummary()}`;
  }
}
