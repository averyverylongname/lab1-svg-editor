export interface Token {
  readonly value: string;
  readonly quoted: boolean;
}

/** 只负责分词，保留引号信息，以区别文本 "in" 与父容器子句。 */
export class CommandParser {
  parse(line: string): Token[] {
    if (line.trimStart().startsWith("#")) return [];
    const tokens: Token[] = [];
    let index = 0;
    while (index < line.length) {
      if (/\s/.test(line[index]!)) {
        index++;
        continue;
      }
      const quoted = line[index] === '"';
      let value = "";
      if (quoted) {
        index++;
        let closed = false;
        while (index < line.length) {
          const char = line[index++]!;
          if (char === '"') {
            closed = true;
            break;
          }
          if (char === "\\" && (line[index] === '"' || line[index] === "\\"))
            value += line[index++]!;
          else value += char;
        }
        if (!closed) throw new Error("unclosed double quote");
        if (index < line.length && !/\s/.test(line[index]!))
          throw new Error("expected whitespace after double quote");
      } else {
        while (index < line.length && !/\s/.test(line[index]!)) {
          if (line[index] === '"')
            throw new Error("double quote must start a parameter");
          value += line[index++]!;
        }
      }
      tokens.push({ value, quoted });
    }
    return tokens;
  }
}
