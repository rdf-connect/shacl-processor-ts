import { describe, expect, test } from "vitest";
import { ProcHelper } from "@rdfc/js-runner/lib/testUtils";
import { Validate } from "../src";
import { resolve } from "path";

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
});
