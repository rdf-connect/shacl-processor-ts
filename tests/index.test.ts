import { validate } from "../src";
import { SimpleStream } from "@ajuvercr/js-runner";
import { describe, test, expect } from "vitest";
import { Validator } from "shacl-engine";
import rdf from "rdf-ext";
import formatsPretty from "@rdfjs/formats/pretty.js";
import { finished } from "readable-stream";
import { promisify } from "node:util";
import { PassThrough } from "readable-stream";
import duplexify from "duplexify";
import { Stream } from "@rdfjs/types";
import NamedNodeExt from "rdf-ext/lib/NamedNode";

async function createInputStream(url: string): Promise<Stream> {
    const res = await rdf.fetch(url);
    res.headers.set("content-type", "text/turtle");
    return res.quadStream();
}

function createShaclStream(shapeStream: Stream): duplexify.Duplexify {
    const input = new PassThrough({ objectMode: true });
    const output = new PassThrough({ objectMode: true });

    queueMicrotask(async () => {
        const shape = await rdf.dataset().import(shapeStream);
        const engine = new Validator(shape, { factory: rdf });
        const dataset = await rdf.dataset().import(input);
        const report = await engine.validate({ dataset });
        report.dataset.toStream().pipe(output);
    });

    // @ts-expect-error Does accept input as Passthrough.
    return duplexify.obj(input, output);
}

async function createOutputStream(
    prefixes: Map<string, NamedNodeExt>,
): Promise<PassThrough> {
    const output = new PassThrough({ objectMode: true });
    const serializer = rdf.formats.serializers.get("text/turtle")!;

    // @ts-expect-error Incorrect arguments, does accept prefixes.
    const stream = serializer.import(output, { prefixes });

    // @ts-expect-error Pipe does work.
    stream.pipe(process.stdout);

    return output;
}

describe("shacl", () => {
    test("library", async () => {
        // Extend formatting with pretty formats.
        rdf.formats.import(formatsPretty);

        // Create input stream.
        let stream = await createInputStream(
            "/Users/jens/Developer/com.imec.shacl-validate-processor.ts/tests/data/invalid.ttl",
        );

        // Create shape stream.
        const shapeStream = await createInputStream(
            "/Users/jens/Developer/com.imec.shacl-validate-processor.ts/tests/shacl/point.ttl",
        );

        // Parse input stream using shape stream.
        const shaclStream = createShaclStream(shapeStream);

        // @ts-expect-error Pipe does work.
        stream.pipe(shaclStream);
        stream = shaclStream;

        // Construct prefixes.
        const prefixes = new Map();
        prefixes.set("ex", rdf.namedNode("http://example.org#"));
        prefixes.set("sh", rdf.namedNode("http://www.w3.org/ns/shacl#"));

        // Output stream.
        const outputStream = await createOutputStream(prefixes);

        // @ts-expect-error Pipe does work.
        stream.pipe(outputStream);

        await promisify(finished)(outputStream);
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
