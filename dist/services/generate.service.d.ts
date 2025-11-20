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
export declare function generateFromTemplate(templateKey: string, name: string, options?: GenerateTemplateOptions): Promise<TemplateGenerateResult>;
//# sourceMappingURL=generate.service.d.ts.map