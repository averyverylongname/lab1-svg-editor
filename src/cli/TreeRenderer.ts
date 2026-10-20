import type { SvgDocument } from '../model/SvgDocument.js';
import type { Shape } from '../model/Shape.js';

export class TreeRenderer {
  tree(document: SvgDocument, id?: string): string {
    if (id !== undefined) {
      const shape = document.find(id);
      return [shape.summary(), ...this.branches(shape.children, '')].join('\n');
    }
    return [`svg (${document.width}x${document.height})`, ...this.branches(document.children, '')].join('\n');
  }

  show(document: SvgDocument, id: string): string {
    const shape = document.find(id);
    const node = shape.toSvgNode();
    const attrs = Object.entries(node.attributes).filter(([key]) => key !== 'id').map(([key, value]) => `  ${key}=${value}`);
    if (node.text !== undefined) attrs.push(`  text=${JSON.stringify(node.text)}`);
    return [`${shape.label}  parent=${document.parentLabel(shape)}`, ...attrs].join('\n');
  }

  private branches(children: readonly Shape[], prefix: string): string[] {
    return children.flatMap((shape, index) => {
      const last = index === children.length - 1;
      return [`${prefix}${last ? '└── ' : '├── '}${shape.summary()}`, ...this.branches(shape.children, `${prefix}${last ? '    ' : '│   '}`)];
    });
  }
}
