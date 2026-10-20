import type { SvgNode } from './SvgNode.js';

/** 所有图形共享的状态与规则；具体几何行为由子类实现。 */
export abstract class Shape {
  abstract readonly type: string;
  private readonly shapeId: string;
  private styles: Record<string, string> = {};
  protected readonly geometry: Record<string, number>;

  protected constructor(id: string, geometry: Record<string, number> = {}) {
    if (!id || /\s/.test(id)) throw new Error('id must be non-empty and contain no whitespace');
    this.shapeId = id;
    this.geometry = { ...geometry };
    for (const [name, value] of Object.entries(geometry)) this.validateGeometry(name, value);
  }

  get id(): string { return this.shapeId; }
  get label(): string { return `${this.type}#${this.id}`; }
  get children(): readonly Shape[] { return []; }

  abstract move(dx: number, dy: number): void;
  abstract clone(): Shape;
  abstract summary(): string;

  scale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) throw new Error('scale factor must be positive');
    for (const key of Object.keys(this.geometry)) this.geometry[key] = Shape.number(this.geometry[key]! * factor, key);
  }

  setAttribute(name: string, value: string): void {
    if (Object.hasOwn(this.geometry, name)) {
      const number = Shape.number(value, name);
      this.validateGeometry(name, number);
      this.geometry[name] = number;
    } else if (['fill', 'stroke', 'stroke-width'].includes(name)) {
      if (name === 'stroke-width' && Shape.number(value, name) < 0) throw new Error('stroke-width must be non-negative');
      this.styles[name] = value;
    } else {
      throw new Error(`unknown attribute: ${name}`);
    }
  }

  toSvgNode(): SvgNode {
    return {
      tag: this.type,
      attributes: { id: this.id, ...Object.fromEntries(Object.entries(this.geometry).map(([k, v]) => [k, String(v)])), ...this.styles },
      children: [],
    };
  }

  attributes(): Readonly<Record<string, string>> { return this.toSvgNode().attributes; }

  protected moveCoordinates(dx: number, dy: number, xs: string[], ys: string[]): void {
    for (const key of xs) this.geometry[key] = Shape.number(this.geometry[key]! + dx, key);
    for (const key of ys) this.geometry[key] = Shape.number(this.geometry[key]! + dy, key);
  }

  protected copyStyles<T extends Shape>(copy: T): T {
    copy.styles = { ...this.styles };
    return copy;
  }

  protected styleSummary(): string {
    return Object.entries(this.styles).map(([k, v]) => ` ${k}=${v}`).join('');
  }

  protected value(name: string): number { return this.geometry[name]!; }

  private validateGeometry(name: string, value: number): void {
    Shape.number(value, name);
    if (['width', 'height', 'r', 'rx', 'ry'].includes(name) && value < 0) throw new Error(`${name} must be non-negative`);
  }

  static number(raw: string | number, name: string): number {
    // Number('') 会得到 0，这不是一个合法的命令行数值。
    const value = typeof raw === 'string' && raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isFinite(value)) throw new Error(`invalid number for ${name}: ${raw}`);
    return value;
  }
}
