import { Stream, Writer } from "@treecg/connector-types";
import rdf, { PrefixMapFactory } from "rdf-ext";
import { Readable } from "stream";
import formatsPretty from "@rdfjs/formats/pretty.js";
import Serializer from "@rdfjs/serializer-turtle";
import { Validator } from "shacl-engine";

export async function validate(
    path: string,
    reader: Stream<string>,
    writer: Writer<string>,
    error?: Writer<string>,
): Promise<() => Promise<void>> {
    // Initialize the shared serializer.
    const prefixes = new PrefixMapFactory().prefixMap();
    prefixes.set("ex", rdf.namedNode("http://example.org#"));
    prefixes.set("sh", rdf.namedNode("http://www.w3.org/ns/shacl#"));
    const serializer = new Serializer({ prefixes });
    const parser = rdf.formats.parsers.get("text/turtle")!;

    // Extend formatting with pretty formats.
    rdf.formats.import(formatsPretty);

    // Create shape stream.
    const res = await rdf.fetch("./tests/shacl/point.ttl");
    const shapes = await res.dataset();

    // Parse input stream using shape stream.
    // @ts-expect-error Factory is valid.
    const validator = new Validator(shapes, { factory: rdf });

    return async () => {
        // Anything that passes through this processor and identifies with a
        // specific shape should match the SHACL definition.
        reader.on("data", async (data) => {
            // Parse data into a dataset.
            const rawStream = Readable.from(data);
            const quadStream = parser.import(rawStream);
            const dataset = await rdf.dataset().import(quadStream);

            // Run through validator.
            const report = await validator.validate({ dataset });
            const reportRaw = serializer.transform(report.dataset);

            // Pass through data if valid.
            if (report.conforms) {
                await writer.push(data);
            }

            // Send report if error channel is given.
            if (error) {
                await error.push(reportRaw);
            }
        });

        // If the input stream closes itself, so should the output streams.
        reader.on("end", () => {
            writer.end();
            error?.end();
        });
    };
}
