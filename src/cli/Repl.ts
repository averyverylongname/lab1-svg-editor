import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { CommandDispatcher } from "./CommandDispatcher.js";

export class Repl {
  constructor(private readonly dispatcher: CommandDispatcher) {}

  async run(
    input: Readable,
    output: Writable,
    interactive: boolean,
  ): Promise<boolean> {
    const lines = createInterface({ input, output, terminal: interactive });
    let success = true;
    if (interactive) {
      output.write("svg-editor 0.1 — type 'help' for commands\n");
      lines.setPrompt("svg> ");
      lines.prompt();
    }
    try {
      for await (const line of lines) {
        try {
          const result = this.dispatcher.execute(line);
          if (result) output.write(`${result}\n`);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          output.write(`error: ${message.replace(/[\r\n]+/g, " ")}\n`);
          success = false;
        }
        if (interactive) lines.prompt();
      }
    } finally {
      lines.close();
    }
    return success;
  }
}
