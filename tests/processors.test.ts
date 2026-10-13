import { describe, expect, test, vi } from "vitest";
import { ProcHelper } from "@rdfc/js-runner/lib/testUtils";
import { Validate } from "../src";
import { resolve } from "path";
import { pathToFileURL } from "url";
import type { Logger } from "winston";

describe("Validate processor tests", async () => {
    test("rdfc:Validate is properly defined", async () => {
        const processorConfig = `
        @prefix rdfc: <https://w3id.org/rdf-connect#>.

        <http://example.com/ns#processor> a rdfc:Validate;
          rdfc:shaclPath "./tests/shacl/point.ttl";
          rdfc:incoming <jr>;
          rdfc:outgoing <jw>;
          rdfc:report <rp>;
          rdfc:validationIsFatal true.
        `;

        const helper = new ProcHelper<Validate>();
        await helper.importFile(resolve("./processors.ttl"));
        await helper.importInline(resolve("./pipeline.ttl"), processorConfig);

        const config = helper.getConfig("Validate");

        expect(config.clazz).toBe("Validate");
        expect(config.location).toBeDefined();
        expect(config.file).toBeDefined();

        const processor = await helper.getProcessor(
            "http://example.com/ns#processor",
        );

        expect(processor.incoming.constructor.name).toBe("ReaderInstance");
        expect(processor.outgoing?.constructor.name).toBe("WriterInstance");
        expect(processor.report?.constructor.name).toBe("WriterInstance");
        expect(processor.shaclPath).toBe("./tests/shacl/point.ttl");
        expect(processor.validationIsFatal).toBe(true);
    });

    test("rdfc:Validate falls back to its default values", async () => {
        const processorConfig = `
        @prefix rdfc: <https://w3id.org/rdf-connect#>.

        <http://example.com/ns#processor> a rdfc:Validate;
          rdfc:shaclPath "./tests/shacl/point.ttl";
          rdfc:incoming <jr>;
          rdfc:outgoing <jw>.
        `;

        const helper = new ProcHelper<Validate>();
        await helper.importFile(resolve("./processors.ttl"));
        await helper.importInline(resolve("./pipeline.ttl"), processorConfig);
        helper.getConfig("Validate");

        const processor = await helper.getProcessor(
            "http://example.com/ns#processor",
        );

        expect(processor.report).toBeUndefined();
        expect(processor.mime).toBe("text/turtle");
        expect(processor.validationIsFatal).toBe(false);
    });

    test("rdfc:shaclPath can be written as an IRI", async () => {
        const processorConfig = `
        @prefix rdfc: <https://w3id.org/rdf-connect#>.

        <http://example.com/ns#processor> a rdfc:Validate;
          rdfc:shaclPath <./tests/shacl/point.ttl>;
          rdfc:incoming <jr>;
          rdfc:outgoing <jw>.
        `;

        const helper = new ProcHelper<Validate>();
        await helper.importFile(resolve("./processors.ttl"));
        await helper.importInline(resolve("./pipeline.ttl"), processorConfig);
        helper.getConfig("Validate");

        // rdf-lens warnings reach the runner logger, whose transports are
        // shared with the processor loggers.
        const logger = (helper.runner as unknown as { logger: Logger }).logger;
        const logs = logger.transports.map((t) => vi.spyOn(t, "log"));

        const processor = await helper.getProcessor(
            "http://example.com/ns#processor",
        );

        const warnings = logs
            .flatMap((log) => log.mock.calls)
            .filter(([info]) => info.level === "warn");
        expect(warnings).toEqual([]);

        // The IRI is resolved against the pipeline and loaded by rdf.fetch,
        // which handles file: URLs itself.
        expect(processor.shaclPath).toBe(
            pathToFileURL(resolve("./tests/shacl/point.ttl")).href,
        );
        await processor.init();
        expect(processor["validator"]).toBeDefined();
    });
});
