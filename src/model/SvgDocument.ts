import { Shape } from "./Shape.js";
import { Group } from "./Group.js";
import type { SvgNode } from "./SvgNode.js";

/** 负责整棵树的结构规则；根节点不是可通过 CLI 寻址的图形。 */
export class SvgDocument {
  private readonly root: Group;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width = 800, height = 600, children: readonly Shape[] = []) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.root = new Group("__root__", children);
    this.resize(width, height);
    const ids = new Set<string>();
    for (const shape of this.walk()) {
      if (ids.has(shape.id)) throw new Error(`id already exists: ${shape.id}`);
      ids.add(shape.id);
    }
  }

  get width(): number {
    return this.canvasWidth;
  }
  get height(): number {
    return this.canvasHeight;
  }
  get children(): readonly Shape[] {
    return this.root.children;
  }
  get count(): number {
    return [...this.walk()].length;
  }

  resize(width: number, height: number): void {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    )
      throw new Error("canvas dimensions must be positive");
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  // ponytail: 线性遍历适用于小型实验文档；大文档再增加同步 id 索引。
  *walk(nodes: readonly Shape[] = this.children): Generator<Shape> {
    for (const node of nodes) {
      yield node;
      yield* this.walk(node.children);
    }
  }

  find(id: string): Shape {
    const shape = [...this.walk()].find((node) => node.id === id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }

  container(id: string): Group {
    const shape = [...this.walk()].find((node) => node.id === id);
    if (!shape) throw new Error(`no such container: ${id}`);
    if (!(shape instanceof Group)) throw new Error(`not a container: ${id}`);
    return shape;
  }

  parentOf(shape: Shape): Group {
    for (const node of [this.root, ...this.walk()]) {
      if (node instanceof Group && node.children.includes(shape)) return node;
    }
    throw new Error(`no such shape: ${shape.id}`);
  }

  parentLabel(shape: Shape): string {
    const parent = this.parentOf(shape);
    return parent === this.root ? "svg" : parent.label;
  }

  add(shape: Shape, parentId?: string): void {
    const existing = new Set([...this.walk()].map((node) => node.id));
    for (const node of this.walk([shape])) {
      if (existing.has(node.id))
        throw new Error(`id already exists: ${node.id}`);
      existing.add(node.id);
    }
    const parent =
      parentId === undefined ? this.root : this.container(parentId);
    parent.insert(shape);
  }

  delete(id: string): Shape {
    const shape = this.find(id);
    this.parentOf(shape).remove(shape);
    return shape;
  }

  group(id: string, ids: readonly string[]): Group {
    if ([...this.walk()].some((shape) => shape.id === id))
      throw new Error(`id already exists: ${id}`);
    if (!ids.length) throw new Error("group requires at least one shape");
    if (new Set(ids).size !== ids.length)
      throw new Error("group contains duplicate ids");
    const selected = ids.map((key) => this.find(key));
    for (const shape of selected) {
      if (
        [...this.walk(shape.children)].some((child) => selected.includes(child))
      ) {
        throw new Error(
          `cannot group a container into its own descendant: ${shape.id}`,
        );
      }
    }
    // 参数次序不改变原绘制顺序。跨父节点时使用原树的深度优先顺序。
    const ordered = [...this.walk()].filter((shape) =>
      selected.includes(shape),
    );
    const firstParent = this.parentOf(ordered[0]!);
    const sameParent = ordered.every(
      (shape) => this.parentOf(shape) === firstParent,
    );
    const parent = sameParent ? firstParent : this.root;
    const index = sameParent
      ? parent.children.indexOf(ordered[0]!)
      : parent.children.length;
    const group = new Group(id);
    for (const shape of ordered) {
      this.parentOf(shape).remove(shape);
      group.insert(shape);
    }
    parent.insert(group, index);
    return group;
  }

  ungroup(id: string): Group {
    const group = this.container(id);
    const parent = this.parentOf(group);
    if (parent === this.root)
      throw new Error(`cannot ungroup top-level container: ${id}`);
    const index = parent.children.indexOf(group);
    const children = [...group.children];
    parent.remove(group);
    for (const [offset, child] of children.entries()) {
      group.remove(child);
      parent.insert(child, index + offset);
    }
    return group;
  }

  addTo(groupId: string, id: string): void {
    const group = this.container(groupId);
    const shape = this.find(id);
    if (shape === group || [...this.walk(shape.children)].includes(group)) {
      throw new Error(
        `cannot group a container into its own descendant: ${id}`,
      );
    }
    this.parentOf(shape).remove(shape);
    group.insert(shape);
  }

  reorder(id: string, front: boolean): Shape {
    const shape = this.find(id);
    const parent = this.parentOf(shape);
    parent.remove(shape);
    parent.insert(shape, front ? parent.children.length : 0);
    return shape;
  }

  clone(): SvgDocument {
    return new SvgDocument(
      this.width,
      this.height,
      this.children.map((shape) => shape.clone()),
    );
  }

  toSvgNode(): SvgNode {
    return {
      tag: "svg",
      attributes: {
        xmlns: "http://www.w3.org/2000/svg",
        width: String(this.width),
        height: String(this.height),
        viewBox: `0 0 ${this.width} ${this.height}`,
      },
      children: this.children.map((shape) => shape.toSvgNode()),
    };
  }
}
