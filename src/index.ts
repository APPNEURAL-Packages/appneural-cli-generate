import { Command } from "commander";
import { registerGenerateCommand } from "./commands/generate.js";

export default function register(program: Command): void {
  registerGenerateCommand(program);
}
