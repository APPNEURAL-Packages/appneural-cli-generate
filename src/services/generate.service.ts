import fs from "fs/promises";
import path from "path";
import { logger, ensureDir, pathExists } from "@appneural/cli-shared";
import { ValidationError } from "@appneural/cli-shared";
import { getCliRoot } from "@appneural/cli-shared";

const TEMPLATE_ROOT = path.join(getCliRoot(), "templates");
const SUPPORTED_CATEGORIES = new Set([
  "nest-service",
  "nest-controller",
  "dto-crud",
  "react-page",
  "microservice-basic",
  "rest-api-module"
]);

export interface GenerateTemplateOptions {
  port?: number;
  entity?: string;
  destination?: string;
}

export interface TemplateGenerateResult {
  template: string;
  outputDir: string;
  fileCount: number;
}

interface VariableBag {
  [key: string]: string;
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join("");
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function buildVariables(name: string, entity: string, port: number): VariableBag {
  return {
    name,
    pascalName: toPascalCase(name),
    camelName: toCamelCase(name),
    kebabName: toKebabCase(name),
    entity,
    entityPascal: toPascalCase(entity),
    entityCamel: toCamelCase(entity),
    entityKebab: toKebabCase(entity),
    port: String(port),
    timestamp: new Date().toISOString()
  };
}

function interpolate(value: string, variables: VariableBag): string {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

async function renderDirectory(source: string, destination: string, variables: VariableBag): Promise<number> {
  const stats = await fs.stat(source);
  if (!stats.isDirectory()) {
    throw new ValidationError("APPNEURAL template path invalid", { source });
  }

  let fileCount = 0;
  const entries = await fs.readdir(source, { withFileTypes: true });
  await ensureDir(destination);

  for (const entry of entries) {
    const targetName = interpolate(entry.name, variables);
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, targetName);

    if (entry.isDirectory()) {
      fileCount += await renderDirectory(sourcePath, destinationPath, variables);
      continue;
    }

    const contents = await fs.readFile(sourcePath, "utf-8");
    const rendered = interpolate(contents, variables);
    await ensureDir(path.dirname(destinationPath));
    await fs.writeFile(destinationPath, rendered, "utf-8");
    fileCount += 1;
  }

  return fileCount;
}

function resolveTemplatePath(templateKey: string): string {
  if (!templateKey.includes("/")) {
    throw new ValidationError("APPNEURAL template key must include category/name", { templateKey });
  }
  const [category] = templateKey.split("/");
  if (!SUPPORTED_CATEGORIES.has(category)) {
    throw new ValidationError("APPNEURAL template category unsupported", { category });
  }
  return path.join(TEMPLATE_ROOT, templateKey);
}

export async function generateFromTemplate(
  templateKey: string,
  name: string,
  options: GenerateTemplateOptions = {}
): Promise<TemplateGenerateResult> {
  if (!name) {
    throw new ValidationError("APPNEURAL template name required");
  }
  const templatePath = resolveTemplatePath(templateKey);
  if (!(await pathExists(templatePath))) {
    throw new ValidationError("APPNEURAL template missing", { templateKey });
  }

  const destination = path.join(process.cwd(), options.destination ?? name);
  await ensureDir(destination);

  const entity = options.entity ?? name;
  const port = options.port ?? 3000 + Math.floor(Math.random() * 1000);
  const variables = buildVariables(name, entity, port);

  const files = await renderDirectory(templatePath, destination, variables);
  logger.debug(`APPNEURAL template '${templateKey}' rendered with ${files} files`);

  return {
    template: templateKey,
    outputDir: destination,
    fileCount: files
  };
}
