import { describe, expect, test } from "vitest";
import { checkProcDefinition, getProc } from "@rdfc/js-runner/lib/testUtils";
import { Validate } from "../src";

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

        const configLocation = process.cwd() + "/processors.ttl";
        await checkProcDefinition(configLocation, "Validate");

        const processor = await getProc<Validate>(
            processorConfig,
            "Validate",
            configLocation,
        );
        await processor.init();

        expect(processor.incoming.constructor.name).toBe("ReaderInstance");
        expect(processor.outgoing?.constructor.name).toBe("WriterInstance");
        expect(processor.report?.constructor.name).toBe("WriterInstance");
        expect(processor.shaclPath).toBe("./tests/shacl/point.ttl");
        expect(processor.validationIsFatal).toBe(true);
    });
});
