import rdf, { PrefixMapFactory } from "rdf-ext";
import { Readable } from "stream";
import formatsPretty from "@rdfjs/formats/pretty.js";
import Serializer from "@rdfjs/serializer-turtle";
import { Validator } from "shacl-engine";
import { Sink, Stream } from "@rdfjs/types";
import { EventEmitter } from "events";
import { ShaclError } from "./error.js";

// The library calls shared by the `Validate` processor and the `shacl-validate`
// CLI, so both arms of the benchmark run exactly the same code.

export type Parser = Sink<EventEmitter, Stream>;

export function createReportSerializer(): Serializer {
    const prefixes = new PrefixMapFactory().prefixMap();
    prefixes.set("sh", rdf.namedNode("http://www.w3.org/ns/shacl#"));
    return new Serializer({ prefixes });
}

export function getParser(mime: string): Parser {
    const parser = rdf.formats.parsers.get(mime);
    if (!parser) {
        throw ShaclError.invalidRdfFormat();
    }

    // Extend formatting with pretty formats.
    rdf.formats.import(formatsPretty);
    return parser;
}

export async function loadValidator(shaclPath: string): Promise<Validator> {
    const res = await rdf.fetch(shaclPath);
    if (!res.ok) {
        throw ShaclError.fileSystemError();
    }

    const shapes = await res.dataset().catch(() => {
        throw ShaclError.invalidRdfFormat();
    });

    return new Validator(shapes, { factory: rdf });
}

export async function parseDataset(parser: Parser, data: Readable) {
    const quadStream = parser.import(data);
    return rdf
        .dataset()
        .import(quadStream)
        .catch(() => {
            throw ShaclError.invalidRdfFormat();
        });
}
