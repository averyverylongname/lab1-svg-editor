import { Editor } from "./application/Editor.js";
import { SvgFileStore } from "./io/SvgFileStore.js";
import { CommandDispatcher } from "./cli/CommandDispatcher.js";
import { Repl } from "./cli/Repl.js";

const editor = new Editor(new SvgFileStore());
const repl = new Repl(new CommandDispatcher(editor));
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const success = await repl.run(process.stdin, process.stdout, interactive);
if (!interactive && !success) process.exitCode = 1;
