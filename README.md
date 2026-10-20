# Lab1：命令行 SVG 编辑器

使用 TypeScript 实现的 SVG 编辑器，支持六种图形、嵌套分组、撤销重做和 SVG 文件读写。

## 运行

需要 Node.js 22 或更高版本。

```sh
npm ci
npm run cli
```

出现 `svg>` 后逐行输入命令，输入 `help` 查看语法，按 `Ctrl+D` 退出。

```text
init 400 200
create g node
create rect r1 30 70 120 60 #4a90d9 in node
create text title 45 105 "开始" in node
move node 20 0
undo
save demo.svg
```

用浏览器打开 `demo.svg` 即可预览。省略颜色时遵循 SVG 默认值；例如 line 没有 stroke 时不会显示，需要显式指定颜色。

## 验证与示例

```sh
npm test
npm run cli --silent < examples/flowchart.commands
```

第二条命令生成 `examples/flowchart.svg`，可与 [流程图示例](examples/flowchart.svg) 对照。脚本模式没有提示符和欢迎语，出现错误后继续处理后续行，最终以退出码 1 表示至少一条命令失败。

`examples/session.commands` 回放任务说明中的典型会话，包含两次预期错误；`examples/other.svg` 演示导入时自动补 id。

## 阅读代码

从 `src/main.ts` 开始，再按 `Repl → CommandDispatcher → MoveCommand → Shape/Group` 阅读一次移动操作。撤销逻辑在 `EditCommand` 和 `History`，文件读写在 `SvgCodec` 和 `SvgFileStore`。

完整架构、边界约定、过程记录与质量保证见 [实验文档](doc/README.md)。原任务说明保留在 [phase_cli_1.md](phase_cli_1.md)。
