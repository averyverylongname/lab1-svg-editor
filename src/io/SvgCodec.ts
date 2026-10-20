import {
  DOMImplementation,
  DOMParser,
  XMLSerializer,
  type Element,
  type Document as XmlDocument,
} from "@xmldom/xmldom";
import { SvgDocument } from "../model/SvgDocument.js";
import { ShapeFactory } from "../model/ShapeFactory.js";
import { Shape } from "../model/Shape.js";
import type { SvgNode } from "../model/SvgNode.js";

/** XML 库只出现在此处，图形模型不依赖 DOM。 */
export class SvgCodec {
  parse(source: string): { document: SvgDocument; warnings: string[] } {
    const xml = new DOMParser({
      onError: (_level, message) => {
        throw new Error(`invalid SVG: ${message}`);
      },
    }).parseFromString(source, "image/svg+xml");
    if (xml.doctype) throw new Error("unsupported SVG: DOCTYPE");
    const root = xml.documentElement;
    if (!root || root.localName !== "svg")
      throw new Error("expected <svg> root");
    this.checkNamespace(root);
    if (
      Array.from(root.childNodes).some(
        (node) =>
          (node.nodeType === 3 || node.nodeType === 4) &&
          node.nodeValue?.trim(),
      )
    ) {
      throw new Error("unsupported text in <svg>");
    }
    const rootAttrs = this.attributes(root);
    for (const key of Object.keys(rootAttrs))
      if (!["width", "height", "viewBox"].includes(key))
        throw new Error(`unsupported SVG root attribute: ${key}`);
    const width = Shape.number(
      (rootAttrs.width ?? "").replace(/px$/, ""),
      "width",
    );
    const height = Shape.number(
      (rootAttrs.height ?? "").replace(/px$/, ""),
      "height",
    );
    if (rootAttrs.viewBox) {
      const box = rootAttrs.viewBox
        .trim()
        .split(/[\s,]+/)
        .map((value) => Shape.number(value, "viewBox"));
      if (
        box.length !== 4 ||
        box[0] !== 0 ||
        box[1] !== 0 ||
        box[2] !== width ||
        box[3] !== height
      )
        throw new Error(
          "unsupported SVG: viewBox must match canvas dimensions",
        );
    }

    // 先扫描所有显式 id，再补全缺失 id，避免与后面的节点碰撞。
    const ids = new Set<string>();
    for (const element of Array.from(root.getElementsByTagName("*"))) {
      const id = element.getAttribute("id");
      if (!id) continue;
      if (ids.has(id)) throw new Error(`id already exists: ${id}`);
      ids.add(id);
    }
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    const factory = new ShapeFactory();
    const nodes = this.childElements(root).map((element) =>
      this.readElement(element, ids, counters, warnings),
    );
    const document = new SvgDocument(
      width,
      height,
      nodes.map((node) => factory.fromSvgNode(node)),
    );
    return { document, warnings };
  }

  stringify(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(null, "", null);
    xml.appendChild(this.writeElement(document.toSvgNode(), xml));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml)}\n`;
  }

  private readElement(
    element: Element,
    ids: Set<string>,
    counters: Map<string, number>,
    warnings: string[],
  ): SvgNode {
    this.checkNamespace(element);
    const tag = element.localName ?? element.tagName;
    const attrs = this.attributes(element);
    if (!attrs.id) {
      let next = counters.get(tag) ?? 1;
      while (ids.has(`${tag}${next}`)) next++;
      attrs.id = `${tag}${next}`;
      ids.add(attrs.id);
      counters.set(tag, next + 1);
      warnings.push(`warning: assigned id ${attrs.id} to unnamed <${tag}>`);
    }
    const children = this.childElements(element);
    const text = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3 || node.nodeType === 4)
      .map((node) => node.nodeValue ?? "")
      .join("");
    if (tag !== "text" && text.trim())
      throw new Error(`unsupported text in <${tag}>`);
    return {
      tag,
      attributes: attrs,
      text,
      children: children.map((child) =>
        this.readElement(child, ids, counters, warnings),
      ),
    };
  }

  private childElements(element: Element): Element[] {
    return Array.from(element.childNodes).filter(
      (node): node is Element => node.nodeType === 1,
    );
  }

  private attributes(element: Element): Record<string, string> {
    return Object.fromEntries(
      Array.from(element.attributes)
        .filter(
          (attr) =>
            attr.namespaceURI !== "http://www.w3.org/2000/xmlns/" &&
            attr.name !== "xmlns",
        )
        .map((attr) => [attr.name, attr.value]),
    );
  }

  private checkNamespace(element: Element): void {
    if (
      element.namespaceURI &&
      element.namespaceURI !== "http://www.w3.org/2000/svg"
    )
      throw new Error("unsupported SVG namespace");
  }

  private writeElement(node: SvgNode, xml: XmlDocument, depth = 0): Element {
    const element = xml.createElementNS("http://www.w3.org/2000/svg", node.tag);
    for (const [name, value] of Object.entries(node.attributes))
      element.setAttribute(name, value);
    if (node.text !== undefined)
      element.appendChild(xml.createTextNode(node.text));
    for (const child of node.children) {
      element.appendChild(xml.createTextNode(`\n${"  ".repeat(depth + 1)}`));
      element.appendChild(this.writeElement(child, xml, depth + 1));
    }
    if (node.children.length)
      element.appendChild(xml.createTextNode(`\n${"  ".repeat(depth)}`));
    return element;
  }
}
