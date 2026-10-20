import { Shape } from "./Shape.js";
import type { SvgNode } from "./SvgNode.js";

/** Composite：通过统一的 Shape 方法操作整棵子树。 */
export class Group extends Shape {
  readonly type = "g";
  private readonly items: Shape[];
  constructor(id: string, children: readonly Shape[] = []) {
    super(id);
    this.items = [...children];
  }
  override get children(): readonly Shape[] {
    return [...this.items];
  }
  move(dx: number, dy: number): void {
    for (const child of this.items) child.move(dx, dy);
  }
  override scale(factor: number): void {
    super.scale(factor);
    for (const child of this.items) child.scale(factor);
  }
  insert(shape: Shape, index = this.items.length): void {
    this.items.splice(index, 0, shape);
  }
  remove(shape: Shape): void {
    const index = this.items.indexOf(shape);
    if (index < 0) throw new Error(`no such child: ${shape.id}`);
    this.items.splice(index, 1);
  }
  clone(): Group {
    return this.copyStyles(
      new Group(
        this.id,
        this.items.map((child) => child.clone()),
      ),
    );
  }
  override toSvgNode(): SvgNode {
    return {
      ...super.toSvgNode(),
      children: this.items.map((child) => child.toSvgNode()),
    };
  }
  summary(): string {
    return `${this.label}${this.styleSummary()}`;
  }
}
