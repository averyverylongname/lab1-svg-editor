import { Editor } from "../application/Editor.js";
import { CreateCommand } from "../application/commands/CreateCommand.js";
import { DeleteCommand } from "../application/commands/DeleteCommand.js";
import { MoveCommand } from "../application/commands/MoveCommand.js";
import { ScaleCommand } from "../application/commands/ScaleCommand.js";
import { SetCommand } from "../application/commands/SetCommand.js";
import { GroupCommand } from "../application/commands/GroupCommand.js";
import { UngroupCommand } from "../application/commands/UngroupCommand.js";
import { AddToCommand } from "../application/commands/AddToCommand.js";
import { ReorderCommand } from "../application/commands/ReorderCommand.js";
import { CommandParser } from "./CommandParser.js";
import { CommandArguments } from "./CommandArguments.js";
import { TreeRenderer } from "./TreeRenderer.js";

type Definition = { syntax: string; run: (args: CommandArguments) => string };

/** 唯一的命令名分派点。编辑命令是对象，查询及文件操作直接调用应用入口。 */
export class CommandDispatcher {
  private readonly parser = new CommandParser();
  private readonly renderer = new TreeRenderer();
  private readonly commands: Map<string, Definition>;

  constructor(editor = new Editor()) {
    // 待重构点：未来出现多种交互入口时，再开放命令注册；不预建插件框架。
    this.commands = new Map<string, Definition>([
      [
        "init",
        {
          syntax: "init [w] [h]",
          run: (args) => {
            args.expect(0, 2);
            return editor.init(
              args.length > 0 ? args.number(0, "width") : 800,
              args.length > 1 ? args.number(1, "height") : 600,
            );
          },
        },
      ],
      [
        "read",
        {
          syntax: "read <file.svg>",
          run: (args) => {
            args.expect(1);
            return editor.read(args.text(0));
          },
        },
      ],
      [
        "save",
        {
          syntax: "save [file.svg]",
          run: (args) => {
            args.expect(0, 1);
            return editor.save(args.length ? args.text(0) : undefined);
          },
        },
      ],
      [
        "canvas",
        {
          syntax: "canvas [w] [h]",
          run: (args) => {
            args.expect(0, 2);
            if (args.length === 1) throw new Error("usage: canvas [w] [h]");
            return args.length
              ? editor.canvas(args.number(0, "width"), args.number(1, "height"))
              : editor.canvas();
          },
        },
      ],
      [
        "create",
        {
          syntax: "create <type> <id> [params...] [in <containerId>]",
          run: (args) => {
            args.expect(2, Infinity);
            const { params, parentId } = args.createParameters();
            return editor.execute(
              new CreateCommand(args.text(0), args.text(1), params, parentId),
            );
          },
        },
      ],
      [
        "delete",
        {
          syntax: "delete <id>",
          run: (args) => {
            args.expect(1);
            return editor.execute(new DeleteCommand(args.text(0)));
          },
        },
      ],
      [
        "move",
        {
          syntax: "move <id> <dx> <dy>",
          run: (args) => {
            args.expect(3);
            return editor.execute(
              new MoveCommand(
                args.text(0),
                args.number(1, "dx"),
                args.number(2, "dy"),
              ),
            );
          },
        },
      ],
      [
        "scale",
        {
          syntax: "scale <id> <factor>",
          run: (args) => {
            args.expect(2);
            return editor.execute(
              new ScaleCommand(args.text(0), args.number(1, "factor")),
            );
          },
        },
      ],
      [
        "set",
        {
          syntax: "set <id> <attr> <value>",
          run: (args) => {
            args.expect(3);
            return editor.execute(
              new SetCommand(args.text(0), args.text(1), args.text(2)),
            );
          },
        },
      ],
      [
        "group",
        {
          syntax: "group <newGid> <id1> [id2...]",
          run: (args) => {
            args.expect(2, Infinity);
            return editor.execute(
              new GroupCommand(args.text(0), args.values(1)),
            );
          },
        },
      ],
      [
        "ungroup",
        {
          syntax: "ungroup <gid>",
          run: (args) => {
            args.expect(1);
            return editor.execute(new UngroupCommand(args.text(0)));
          },
        },
      ],
      [
        "addto",
        {
          syntax: "addto <gid> <id>",
          run: (args) => {
            args.expect(2);
            return editor.execute(new AddToCommand(args.text(0), args.text(1)));
          },
        },
      ],
      [
        "front",
        {
          syntax: "front <id>",
          run: (args) => {
            args.expect(1);
            return editor.execute(new ReorderCommand(args.text(0), true));
          },
        },
      ],
      [
        "back",
        {
          syntax: "back <id>",
          run: (args) => {
            args.expect(1);
            return editor.execute(new ReorderCommand(args.text(0), false));
          },
        },
      ],
      [
        "tree",
        {
          syntax: "tree [id]",
          run: (args) => {
            args.expect(0, 1);
            return this.renderer.tree(
              editor.document,
              args.length ? args.text(0) : undefined,
            );
          },
        },
      ],
      [
        "show",
        {
          syntax: "show <id>",
          run: (args) => {
            args.expect(1);
            return this.renderer.show(editor.document, args.text(0));
          },
        },
      ],
      [
        "help",
        {
          syntax: "help",
          run: (args) => {
            args.expect(0);
            return this.help();
          },
        },
      ],
      [
        "undo",
        {
          syntax: "undo",
          run: (args) => {
            args.expect(0);
            return editor.undo();
          },
        },
      ],
      [
        "redo",
        {
          syntax: "redo",
          run: (args) => {
            args.expect(0);
            return editor.redo();
          },
        },
      ],
    ]);
  }

  execute(line: string): string {
    const [name, ...tokens] = this.parser.parse(line);
    if (!name) return "";
    const definition = this.commands.get(name.value);
    if (!definition) throw new Error(`unknown command: ${name.value}`);
    return definition.run(new CommandArguments(tokens, definition.syntax));
  }

  private help(): string {
    return [
      ...[...this.commands.values()].map((command) => command.syntax),
      "",
      "图形参数：",
      "  rect <id> <x> <y> <w> <h> [fill]",
      "  circle <id> <cx> <cy> <r> [fill]",
      "  ellipse <id> <cx> <cy> <rx> <ry> [fill]",
      "  line <id> <x1> <y1> <x2> <y2> [stroke]",
      '  text <id> <x> <y> "content"',
      "  g <id>",
      "带空格参数用双引号；# 开头的整行是注释；Ctrl+D 退出。",
    ].join("\n");
  }
}
