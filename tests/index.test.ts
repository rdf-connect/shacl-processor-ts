import { validate } from "../src";
import { SimpleStream } from "@ajuvercr/js-runner";
import { describe, test, expect } from "vitest";
import { Validator } from "shacl-engine";
import rdf, { PrefixMapFactory } from "rdf-ext";
import formatsPretty from "@rdfjs/formats/pretty.js";
import Serializer from "@rdfjs/serializer-turtle";

describe("shacl", () => {
    test("library", async () => {
        // Initialize the shared serializer.
        const prefixes = new PrefixMapFactory().prefixMap();
        prefixes.set("ex", rdf.namedNode("http://example.org#"));
        prefixes.set("sh", rdf.namedNode("http://www.w3.org/ns/shacl#"));
        const serializer = new Serializer({ prefixes });

        // Extend formatting with pretty formats.
        rdf.formats.import(formatsPretty);

        // Create input stream.
        let res = await rdf.fetch("./tests/data/invalid.ttl");
        const dataset = await res.dataset();

        // Create shape stream.
        res = await rdf.fetch("./tests/shacl/point.ttl");
        const shapes = await res.dataset();

        // Parse input stream using shape stream.
        const validator = new Validator(shapes, { factory: rdf });

        // Export the report.
        const report = await validator.validate({ dataset });
        console.log(serializer.transform(report.dataset));
    });

    test("successful", async () => {
        expect.assertions(2);

        // Function parameters.
        const path = "./tests/shacl/point.ttl";
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
