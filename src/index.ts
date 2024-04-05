import { Stream, Writer } from "@treecg/connector-types";
import rdf, { PrefixMapFactory } from "rdf-ext";
import { Readable } from "stream";
import formatsPretty from "@rdfjs/formats/pretty.js";
import Serializer from "@rdfjs/serializer-turtle";
import { Validator } from "shacl-engine";
import { ShaclError } from "./error";

type ValidateArguments = {
    shaclPath: string;
    incoming: Stream<string>;
    outgoing: Writer<string>;
    report?: Writer<string>;
    validationIsFatal?: boolean;
};

export async function validate(
    args: ValidateArguments,
): Promise<() => Promise<void>> {
    const { shaclPath, incoming, outgoing, report, validationIsFatal } = args;

    // Initialize the shared serializer.
    const prefixes = new PrefixMapFactory().prefixMap();
    prefixes.set("sh", rdf.namedNode("http://www.w3.org/ns/shacl#"));
    const serializer = new Serializer({ prefixes });
    const parser = rdf.formats.parsers.get("text/turtle")!;

    // Extend formatting with pretty formats.
    rdf.formats.import(formatsPretty);

    // Create shape stream.
    const res = await rdf.fetch(shaclPath);
    if (!res.ok) {
        throw ShaclError.fileSystemError();
    }

    const shapes = await res.dataset().catch(() => {
        throw ShaclError.invalidRdfFormat();
    });

    // Parse input stream using shape stream.
    // @ts-expect-error Factory is valid.
    const validator = new Validator(shapes, { factory: rdf });

    return async () => {
        // Anything that passes through this processor and identifies with a
        // specific shape should match the SHACL definition.
        incoming.on("data", async (data) => {
            // Parse data into a dataset.
            const rawStream = Readable.from(data);
            const quadStream = parser.import(rawStream);
            const dataset = await rdf
                .dataset()
                .import(quadStream)
                .catch(() => {
                    throw ShaclError.invalidRdfFormat();
                });

            // Run through validator.
            const result = await validator.validate({ dataset });

            // Pass through data if valid.
            if (result.conforms) {
                await outgoing.push(data);
            } else if (validationIsFatal) {
                throw ShaclError.validationFailed();
            } else if (report) {
                const resultRaw = serializer.transform(result.dataset);
                await report.push(resultRaw);
            }
        });

        // If the input stream closes itself, so should the output streams.
        incoming.on("end", () => {
            outgoing.end();
            report?.end();
        });
    };
}
