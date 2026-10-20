import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

test("模块依赖遵循方案，一类一文件，模型不接触 IO 或 CLI", () => {
  const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
  const rules = {
    model: ["model"],
    io: ["io", "model"],
    application: ["application", "model", "io"],
    cli: ["cli", "application", "model"],
  };
  const files = readdirSync(sourceRoot, { recursive: true }).filter((name) =>
    name.endsWith(".ts"),
  );
  for (const file of files) {
    const path = join(sourceRoot, file);
    const source = readFileSync(path, "utf8");
    const module = file.split("/")[0];
    const classes = [...source.matchAll(/^export (?:abstract )?class (\w+)/gm)];
    assert.ok(classes.length <= 1, `${file} 包含多个类`);
    if (classes.length) assert.equal(classes[0][1], basename(file, ".ts"));
    if (file === "main.ts") continue;
    // 本项目使用静态 import；这里只检查依赖边界，不引入额外的 lint 工具。
    for (const statement of source.matchAll(
      /^import\s+[^;]+?\s+from\s+['"]([^'"]+)['"]/gm,
    )) {
      const target = statement[1];
      if (!target.startsWith(".")) {
        assert.ok(
          module === "io" || (module === "cli" && target.startsWith("node:")),
          `${file} 不应导入 ${target}`,
        );
        continue;
      }
      const destination = relative(
        sourceRoot,
        resolve(dirname(path), target),
      ).split("/")[0];
      assert.ok(rules[module].includes(destination), `${file} -> ${target}`);
    }
  }
});
