import { Shape } from "../model/Shape.js";
import type { Token } from "./CommandParser.js";

export class CommandArguments {
  constructor(
    private readonly tokens: readonly Token[],
    private readonly syntax: string,
  ) {}

  get length(): number {
    return this.tokens.length;
  }

  expect(min: number, max = min): void {
    if (this.length < min || this.length > max)
      throw new Error(`usage: ${this.syntax}`);
  }

  text(index: number): string {
    const token = this.tokens[index];
    if (!token) throw new Error(`usage: ${this.syntax}`);
    return token.value;
  }

  number(index: number, name: string): number {
    return Shape.number(this.text(index), name);
  }
  values(start = 0): string[] {
    return this.tokens.slice(start).map((token) => token.value);
  }

  createParameters(): { params: string[]; parentId?: string } {
    const suffix = this.tokens.at(-2);
    const hasParent =
      this.length >= 4 && suffix?.value === "in" && !suffix.quoted;
    return {
      params: this.tokens
        .slice(2, hasParent ? -2 : undefined)
        .map((token) => token.value),
      parentId: hasParent ? this.text(this.length - 1) : undefined,
    };
  }
}
