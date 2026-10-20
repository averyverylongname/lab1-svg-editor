import { Shape } from './Shape.js';
import { Rect } from './Rect.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';
import { Group } from './Group.js';
import type { SvgNode } from './SvgNode.js';

type Definition = {
  geometry: readonly string[];
  text?: boolean;
  color?: string;
  build: (id: string, numbers: number[], text: string) => Shape;
};

/** 唯一的图形类型分派点；CLI 创建与 SVG 导入共用同一张表。 */
export class ShapeFactory {
  // 待重构点：后续需要插件时，再开放注册接口；本阶段不加载插件。
  private readonly definitions: ReadonlyMap<string, Definition> = new Map([
    ['rect', { geometry: ['x', 'y', 'width', 'height'], color: 'fill', build: (id, n) => new Rect(id, n[0]!, n[1]!, n[2]!, n[3]!) }],
    ['circle', { geometry: ['cx', 'cy', 'r'], color: 'fill', build: (id, n) => new Circle(id, n[0]!, n[1]!, n[2]!) }],
    ['ellipse', { geometry: ['cx', 'cy', 'rx', 'ry'], color: 'fill', build: (id, n) => new Ellipse(id, n[0]!, n[1]!, n[2]!, n[3]!) }],
    ['line', { geometry: ['x1', 'y1', 'x2', 'y2'], color: 'stroke', build: (id, n) => new Line(id, n[0]!, n[1]!, n[2]!, n[3]!) }],
    ['text', { geometry: ['x', 'y'], text: true, build: (id, n, text) => new Text(id, n[0]!, n[1]!, text) }],
    ['g', { geometry: [], build: id => new Group(id) }],
  ]);

  create(type: string, id: string, params: readonly string[]): Shape {
    const def = this.definition(type);
    const count = def.geometry.length + (def.text ? 1 : 0);
    if (params.length < count || params.length > count + (def.color ? 1 : 0)) throw new Error(`invalid parameters for ${type}`);
    const numbers = def.geometry.map((key, index) => Shape.number(params[index]!, key));
    const shape = def.build(id, numbers, def.text ? params[count - 1]! : '');
    if (def.color && params.length > count) shape.setAttribute(def.color, params[count]!);
    return shape;
  }

  fromSvgNode(node: SvgNode): Shape {
    const def = this.definition(node.tag);
    const numbers = def.geometry.map(key => Shape.number(node.attributes[key] ?? '0', key));
    const shape = def.build(node.attributes.id!, numbers, node.text ?? '');
    for (const [key, value] of Object.entries(node.attributes)) {
      if (key === 'id' || def.geometry.includes(key)) continue;
      // 读取外部 box 时按普通 g 降级；不宣称保留插件语义。
      if (key === 'data-kind' && shape instanceof Group) continue;
      shape.setAttribute(key, value);
    }
    if (shape instanceof Group) for (const child of node.children) shape.insert(this.fromSvgNode(child));
    else if (node.children.length) throw new Error(`unsupported children in <${node.tag}>`);
    return shape;
  }

  private definition(type: string): Definition {
    const def = this.definitions.get(type);
    if (!def) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return def;
  }
}
