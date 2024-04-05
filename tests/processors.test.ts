import { expect, test, describe } from "vitest";
import { extractProcessors, extractSteps, Source } from "@ajuvercr/js-runner";

const pipeline = `
        @prefix js: <https://w3id.org/conn/js#>.
        @prefix ws: <https://w3id.org/conn/ws#>.
        @prefix : <https://w3id.org/conn#>.
        @prefix owl: <http://www.w3.org/2002/07/owl#>.
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
        @prefix sh: <http://www.w3.org/ns/shacl#>.

        <> owl:imports <./node_modules/@ajuvercr/js-runner/ontology.ttl>, <./processors.ttl>.

        [ ] a js:Validate;
            js:args [
                js:shaclPath "/tmp/path.ttl";
                js:incoming [
                  a js:JsReaderChannel;
                ];
                js:outgoing [
                  a js:JsWriterChannel;
                ];
                js:report [
                  a js:JsWriterChannel;
                ];
                js:validationIsFatal "true"^^xsd:boolean;
            ].
    `;

describe("processor", () => {
    test("definition", async () => {
        expect.assertions(8);

        const source: Source = {
            value: pipeline,
            baseIRI: process.cwd() + "/config.ttl",
            type: "memory",
        };

        // Parse pipeline into processors.
        const {
            processors,
            quads,
            shapes: config,
        } = await extractProcessors(source);

        // Extract the Log processor.
        const env = processors.find((x) => x.ty.value.endsWith("Validate"))!;
        expect(env).toBeDefined();

        const args = extractSteps(env, quads, config);
        expect(args.length).toBe(1);
        expect(args[0].length).toBe(1);

        const [{ shaclPath, incoming, outgoing, report, validationIsFatal }] =
            args[0];
        expect(shaclPath).toBe("/tmp/path.ttl");
        expect(incoming.ty.id).toBe("https://w3id.org/conn/js#JsReaderChannel");
        expect(outgoing.ty.id).toBe("https://w3id.org/conn/js#JsWriterChannel");
        expect(report.ty.id).toBe("https://w3id.org/conn/js#JsWriterChannel");
        expect(validationIsFatal).toBeTruthy();
    });
});
