import { validate } from "../src";
import { SimpleStream } from "@ajuvercr/js-runner";
import { describe, test, expect } from "vitest";
import { Validator } from "shacl-engine";
import rdf from "rdf-ext";
import formatsPretty from "@rdfjs/formats/pretty.js";

describe("shacl", () => {
    test("library", async () => {
        // Extend formatting with pretty formats.
        rdf.formats.import(formatsPretty);

        // Create input stream.
        let res = await rdf.fetch(
            "/Users/jens/Developer/com.imec.shacl-validate-processor.ts/tests/data/invalid.ttl",
        );
        res.headers.set("content-type", "text/turtle");
        const stream = await res.quadStream();

        // Create shape stream.
        res = await rdf.fetch(
            "/Users/jens/Developer/com.imec.shacl-validate-processor.ts/tests/shacl/point.ttl",
        );
        res.headers.set("content-type", "text/turtle");
        const shapeStream = await res.quadStream();

        // Parse input stream using shape stream.
        const shapes = await rdf.dataset().import(shapeStream);
        const validator = new Validator(shapes, { factory: rdf });
        const dataset = await rdf.dataset().import(stream);
        const report = await validator.validate({ dataset });
        const reportStream = report.dataset.toStream();

        // Construct prefixes.
        const prefixes = new Map();
        prefixes.set("ex", rdf.namedNode("http://example.org#"));
        prefixes.set("sh", rdf.namedNode("http://www.w3.org/ns/shacl#"));

        // Output stream.
        const serializer = rdf.formats.serializers.get("text/turtle")!;
        // @ts-expect-error Incorrect arguments, does accept prefixes.
        const resultStream = serializer.import(reportStream, { prefixes });
        // @ts-expect-error Pipe does work.
        resultStream.pipe(process.stdout);
    });

    test("successful", async () => {
        expect.assertions(2);

        // Function parameters.
        const path =
            "/Users/jens/Developer/com.imec.shacl-validate-processor.ts/tests/shacl/point.ttl";
        const incoming = new SimpleStream<string>();
        const outgoing = new SimpleStream<string>();
        const error = new SimpleStream<string>();

        // A valid point shape.
        const point = `
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        [ ] a <point>;
          <x> "1"^^xsd:integer;
          <y> "2"^^xsd:integer.
        `;

        // An invalid point shape.
        const invalid = `
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        [ ] a <point>;
          <a> "3"^^xsd:integer;
          <b> "4"^^xsd:integer.
        `;

        // Set expected data.
        outgoing.on("data", (data) => expect(data).toEqual(point));
        error.on("data", (data) => expect(data).toEqual(invalid));

        // Initialize and execute the function.
        const func = await validate(path, incoming, outgoing, error);
        await func();

        // Send point into the pipeline.
        await incoming.push(point);
        await incoming.push(invalid);

        // Finish testing.
        await incoming.end();
        await outgoing.end();
        await error.end();
    });
});
