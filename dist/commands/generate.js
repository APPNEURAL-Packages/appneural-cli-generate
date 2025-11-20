import { logger } from "@appneural/cli-shared";
import { withTelemetry } from "@appneural/cli-shared";
import { withSpinner } from "@appneural/cli-shared";
import { generateFromTemplate } from "../services/generate.service.js";
export function registerGenerateCommand(program) {
    program
        .command("generate <template> <name>")
        .description("Render an APPNEURAL snippet/template into the workspace")
        .option("--port <port>", "Port number for Nest services", (value) => Number.parseInt(value, 10))
        .option("--entity <entity>", "Entity or DTO name override")
        .option("--out <dir>", "Destination directory override")
        .action((template, name, options) => withTelemetry("generate:template", async () => {
        const result = await withSpinner("Rendering APPNEURAL template", () => generateFromTemplate(template, name, {
            port: options.port,
            entity: options.entity,
            destination: options.out
        }));
        logger.success(`APPNEURAL template '${result.template}' created ${result.fileCount} files at ${result.outputDir}`);
    }));
}
//# sourceMappingURL=generate.js.map