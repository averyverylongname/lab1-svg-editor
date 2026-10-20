import { Shape } from "./Shape.js";

export class Ellipse extends Shape {
  readonly type = "ellipse";
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, { cx, cy, rx, ry });
  }
  move(dx: number, dy: number): void {
    this.moveCoordinates(dx, dy, ["cx"], ["cy"]);
  }
  clone(): Ellipse {
    return this.copyStyles(
      new Ellipse(
        this.id,
        this.value("cx"),
        this.value("cy"),
        this.value("rx"),
        this.value("ry"),
      ),
    );
  }
  summary(): string {
    return `${this.label}  cx=${this.value("cx")} cy=${this.value("cy")} rx=${this.value("rx")} ry=${this.value("ry")}${this.styleSummary()}`;
  }
}
