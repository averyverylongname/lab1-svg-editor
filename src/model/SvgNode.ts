/** 模型与 XML 读写层之间的传输结构，不承担图形行为。 */
export interface SvgNode {
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly text?: string;
  readonly children: readonly SvgNode[];
}
