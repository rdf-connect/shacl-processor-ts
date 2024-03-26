import { Stream, Writer } from "@treecg/connector-types";
import { Validator } from "shacl-engine";
import { fromFile } from "rdf-utils-fs";
import rdfDataModel from "@rdfjs/data-model";
import rdf from "rdf-ext";
import formats from "@rdfjs/formats-common";
import { Readable } from "stream";
import { ShaclError } from "./error";

async function buildValidator(path: string): Promise<Validator> {
    // Initialize the SHACL dataset.
    const stream = fromFile(path);
    const dataset = await rdf.dataset().import(stream);

    // Initialize the validator.
    return new Validator(dataset, {
        factory: rdfDataModel,
    });
}

export async function validate(
    path: string,
    reader: Stream<string>,
    writer: Writer<string>,
    error: Writer<string>,
): Promise<() => Promise<void>> {
    const validator = await buildValidator(path);

    // TODO: accept other data types.
    const parser = formats.parsers.get("text/turtle");
    if (!parser) {
        throw ShaclError.invalidRdfFormat();
    }

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

            if (report.conforms) {
                await writer.push(data);
            } else {
                await error.push(data);
            }
        });

        // If the input stream closes itself, so should the output streams.
        reader.on("end", () => {
            writer.end();
            error.end();
        });
    };
}
