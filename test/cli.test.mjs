import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { Editor } from "../dist/application/Editor.js";
import { CommandDispatcher } from "../dist/cli/CommandDispatcher.js";
import { CommandParser } from "../dist/cli/CommandParser.js";
import { SvgCodec } from "../dist/io/SvgCodec.js";

const root = fileURLToPath(new URL("../", import.meta.url));

test("分词支持中文、空文本、转义、带空格路径与整行注释，保留颜色", () => {
  const parser = new CommandParser();
  assert.deepEqual(parser.parse("  # comment"), []);
  assert.deepEqual(parser.parse(" "), []);
  assert.deepEqual(
    parser.parse('set t text ""').map((x) => x.value),
    ["set", "t", "text", ""],
  );
  assert.deepEqual(
    parser
      .parse('set t text "中文 \\"quoted\\" \\\\ path"')
      .map((x) => x.value),
    ["set", "t", "text", '中文 "quoted" \\ path'],
  );
  assert.deepEqual(
    parser.parse('read "a file.svg"').map((x) => x.value),
    ["read", "a file.svg"],
  );
  assert.equal(
    parser.parse("create rect r 0 0 1 1 #ffffff").at(-1).value,
    "#ffffff",
  );
  assert.throws(() => parser.parse('set t text "bad'), /unclosed/);
  assert.throws(() => parser.parse('set t text "bad"tail'), /whitespace/);
});

test("命令分派覆盖创建、显示、属性白名单和容器继承", () => {
  const editor = new Editor();
  const cli = new CommandDispatcher(editor);
  assert.match(cli.execute("help"), /create <type>/);
  assert.throws(() => cli.execute("tree"), /no document/);
  cli.execute("init 400");
  assert.equal(cli.execute("canvas"), "canvas 400x600");
  cli.execute("create g scene");
  cli.execute("create rect r 0 0 10 20 in scene");
  cli.execute('create text title 1 2 "in" in scene');
  cli.execute("create circle c 3 4 5 red");
  cli.execute("create ellipse e 3 4 5 6");
  cli.execute("create line l 0 0 30 40 black");
  cli.execute("set scene fill blue");
  cli.execute('set title text ""');
  cli.execute("set r width 15");
  cli.execute("set l stroke-width 2");
  assert.equal(editor.document.find("r").attributes().fill, undefined);
  assert.equal(editor.document.find("scene").attributes().fill, "blue");
  assert.match(
    cli.execute("tree scene"),
    /^g#scene fill=blue\n├── rect#r  x=0 y=0 w=15 h=20\n└── text#title  \(1,2\) ""$/,
  );
  assert.match(
    cli.execute("show title"),
    /text#title  parent=g#scene\n  x=1\n  y=2\n  text=""/,
  );
  const before = editor.document.toSvgNode();
  for (const command of [
    "set r cx 1",
    "set title label xx",
    "set scene width 1",
    "set r id other",
    "set l stroke-width -1",
  ]) {
    assert.throws(() => cli.execute(command));
    assert.deepEqual(editor.document.toSvgNode(), before);
  }
});

test("结构编辑的撤销重做恢复父级、子孙与 z-order；跨父节点分组保持原遍历顺序", () => {
  const editor = new Editor();
  const cli = new CommandDispatcher(editor);
  for (const command of [
    "init",
    "create g scene",
    "create g left in scene",
    "create g right in scene",
    "create rect a 1 2 3 4 in left",
    "create circle b 5 6 7 in left",
    'create text c 8 9 "C" in right',
  ])
    cli.execute(command);
  cli.execute("front a");
  assert.deepEqual(
    editor.document.find("left").children.map((x) => x.id),
    ["b", "a"],
  );
  cli.execute("back a");
  assert.deepEqual(
    editor.document.find("left").children.map((x) => x.id),
    ["a", "b"],
  );
  let before = editor.document.toSvgNode();
  cli.execute("addto right a");
  assert.deepEqual(
    editor.document.find("right").children.map((x) => x.id),
    ["c", "a"],
  );
  cli.execute("undo");
  assert.deepEqual(editor.document.toSvgNode(), before);
  cli.execute("group cross c a");
  assert.deepEqual(
    editor.document.children.map((x) => x.id),
    ["scene", "cross"],
  );
  assert.deepEqual(
    editor.document.find("cross").children.map((x) => x.id),
    ["a", "c"],
  );
  cli.execute("undo");
  assert.deepEqual(editor.document.toSvgNode(), before);
  cli.execute("group local b a");
  before = editor.document.toSvgNode();
  cli.execute("ungroup local");
  cli.execute("undo");
  assert.deepEqual(editor.document.toSvgNode(), before);
  cli.execute("redo");
  assert.deepEqual(
    editor.document.find("left").children.map((x) => x.id),
    ["a", "b"],
  );
  cli.execute("delete left");
  assert.throws(() => cli.execute("show a"), /no such shape/);
  cli.execute("undo");
  assert.equal(
    editor.document.parentLabel(editor.document.find("a")),
    "g#left",
  );
});

test("规范错误逐项匹配；非法输入不改变文档、可撤销记录或 redo", () => {
  const editor = new Editor();
  const cli = new CommandDispatcher(editor);
  for (const command of [
    "init",
    "create g g",
    "create rect r 0 0 1 1 in g",
    "move r 1 1",
    "undo",
  ])
    cli.execute(command);
  const before = editor.document.toSvgNode();
  for (const [command, message] of [
    ["create circle r 0 0 1", "id already exists: r"],
    ["delete missing", "no such shape: missing"],
    ["create g x in missing", "no such container: missing"],
    ["create g x in r", "not a container: r"],
    ["create box x", "unknown shape type: box (is the plugin loaded?)"],
    ["group x g r", "cannot group a container into its own descendant: g"],
    ["ungroup g", "cannot ungroup top-level container: g"],
    ["scale r -1", "scale factor must be positive"],
    ["set r bogus 1", "unknown attribute: bogus"],
    ["addto g g", "cannot group a container into its own descendant: g"],
    ["addto r g", "not a container: r"],
    ["group x r r", "group contains duplicate ids"],
  ]) {
    assert.throws(() => cli.execute(command), { message }, command);
    assert.deepEqual(editor.document.toSvgNode(), before, command);
  }
  for (const command of [
    "move r NaN 0",
    "scale r Infinity",
    "create rect x 0 0 -1 2",
    "canvas 10",
    "tree r extra",
    "unknown",
    'set r x ""',
  ]) {
    assert.throws(() => cli.execute(command), undefined, command);
    assert.deepEqual(editor.document.toSvgNode(), before, command);
  }
  cli.execute("redo");
  assert.equal(editor.document.find("r").attributes().x, "1");
});

test("大小写敏感 id、引号中的 in、文本为 in 和父容器 id 为 in 均不冲突", () => {
  const editor = new Editor();
  const cli = new CommandDispatcher(editor);
  for (const command of [
    "init",
    "create g in",
    'create text t 1 2 "in"',
    'create text T 1 2 "hello in" in in',
  ])
    cli.execute(command);
  assert.equal(editor.document.find("t").toSvgNode().text, "in");
  assert.equal(editor.document.find("T").toSvgNode().text, "hello in");
  assert.equal(editor.document.parentLabel(editor.document.find("T")), "g#in");
});

test("真实子进程回放命令并生成 SVG；批处理错误逐行输出、继续处理并返回失败退出码", () => {
  const directory = mkdtempSync(join(tmpdir(), "svg-cli-"));
  try {
    const file = join(directory, "flow chart.svg");
    const input = [
      "# test",
      "init 400 200",
      "create g flow",
      "create rect start 30 70 120 60 blue in flow",
      'create text label 40 100 "开始 & <结束>" in flow',
      "move flow 10 0",
      "undo",
      "redo",
      `save "${file}"`,
      "tree",
    ].join("\n");
    const process = spawnSync(globalThis.process.execPath, ["dist/main.js"], {
      cwd: root,
      input,
      encoding: "utf8",
    });
    assert.equal(process.status, 0, process.stderr);
    assert.equal(process.stderr, "");
    assert.match(process.stdout, /saved to .* \(3 elements\)/);
    const saved = new SvgCodec().parse(readFileSync(file, "utf8")).document;
    assert.equal(saved.find("start").attributes().x, "40");
    assert.equal(saved.find("label").toSvgNode().text, "开始 & <结束>");
    const failed = spawnSync(globalThis.process.execPath, ["dist/main.js"], {
      cwd: root,
      input: "tree\ninit\ncreate rect r 0 0 1 1\nscale r 0\nshow r\n",
      encoding: "utf8",
    });
    assert.equal(failed.status, 1);
    assert.deepEqual(
      failed.stdout.split("\n").filter((line) => line.startsWith("error:")),
      [
        "error: no document. use 'init' or 'read' first",
        "error: scale factor must be positive",
      ],
    );
    assert.match(failed.stdout, /rect#r  parent=svg/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
