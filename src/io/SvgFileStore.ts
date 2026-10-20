import { readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { SvgCodec } from "./SvgCodec.js";
import type { SvgDocument } from "../model/SvgDocument.js";

export class SvgFileStore {
  constructor(private readonly codec = new SvgCodec()) {}

  read(path: string): { document: SvgDocument; warnings: string[] } {
    let source: string;
    try {
      source = readFileSync(path, "utf8");
    } catch {
      throw new Error(`cannot read file: ${path}`);
    }
    return this.codec.parse(source);
  }

  write(path: string, document: SvgDocument): void {
    const source = this.codec.stringify(document);
    const temporary = join(
      dirname(path),
      `.${basename(path)}.${randomUUID()}.tmp`,
    );
    try {
      // 同目录写完再替换，写入失败时保留原文件。
      writeFileSync(temporary, source, { encoding: "utf8", flag: "wx" });
      renameSync(temporary, path);
    } catch {
      rmSync(temporary, { force: true });
      throw new Error(`cannot write file: ${path}`);
    }
  }
}
