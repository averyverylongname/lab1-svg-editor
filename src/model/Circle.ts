import { Shape } from "./Shape.js";

export class Circle extends Shape {
  readonly type = "circle";
  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, { cx, cy, r });
  }
  move(dx: number, dy: number): void {
    this.moveCoordinates(dx, dy, ["cx"], ["cy"]);
  }
  clone(): Circle {
    return this.copyStyles(
      new Circle(this.id, this.value("cx"), this.value("cy"), this.value("r")),
    );
  }
  summary(): string {
    return `${this.label}  cx=${this.value("cx")} cy=${this.value("cy")} r=${this.value("r")}${this.styleSummary()}`;
  }
}
