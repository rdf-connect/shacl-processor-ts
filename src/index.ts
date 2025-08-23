import rdf, { PrefixMapFactory } from "rdf-ext";
import { Readable } from "stream";
import formatsPretty from "@rdfjs/formats/pretty.js";
import Serializer from "@rdfjs/serializer-turtle";
import { Validator } from "shacl-engine";
import { ShaclError } from "./error";
import { Processor, Reader, Writer } from "@rdfc/js-runner";
import { Sink, Stream } from "@rdfjs/types";

type ValidateArgs = {
    shaclPath: string;
    incoming: Reader;
    outgoing: Writer;
    report?: Writer;
    mime?: string;
    validationIsFatal?: boolean;
};

export class Validate extends Processor<ValidateArgs> {
    protected serializer: Serializer;
    protected parser: Sink<import("events")<[never]>, Stream> | undefined;
    protected validator: Validator;

    async init(this: ValidateArgs & this): Promise<void> {
        // Default arguments.
        this.mime = this.mime ?? "text/turtle";
        this.validationIsFatal = this.validationIsFatal ?? false;

        // Initialize the shared serializer.
        const prefixes = new PrefixMapFactory().prefixMap();
        prefixes.set("sh", rdf.namedNode("http://www.w3.org/ns/shacl#"));
        this.serializer = new Serializer({ prefixes });
        this.logger.debug("Serializer is initialized.");

        // Initialize the data parser.
        this.parser = rdf.formats.parsers.get(this.mime);
        if (!this.parser) {
            throw ShaclError.invalidRdfFormat();
        }
        this.logger.debug("Parser is initialized.");

        // Extend formatting with pretty formats.
        rdf.formats.import(formatsPretty);

        // Create shape stream.
        const res = await rdf.fetch(this.shaclPath);
        if (!res.ok) {
            throw ShaclError.fileSystemError();
        }

        const shapes = await res.dataset().catch(() => {
            throw ShaclError.invalidRdfFormat();
        });
        this.logger.debug("Shapes are loaded.");

        // Parse input stream using shape stream.
        // @ts-expect-error Factory is valid.
        this.validator = new Validator(shapes, { factory: rdf });
        this.logger.debug("Validator is initialized.");
    }

    async transform(this: ValidateArgs & this): Promise<void> {
        for await (const data of this.incoming.strings()) {
            // Parse data into a dataset.
            const rawStream = Readable.from(data);
            const quadStream = this.parser!.import(rawStream);
            const dataset = await rdf
                .dataset()
                .import(quadStream)
                .catch(() => {
                    throw ShaclError.invalidRdfFormat();
                });

            // Run through validator.
            const result = await this.validator.validate({ dataset });

            // Pass through data if valid.
            if (result.conforms) {
                this.logger.debug(`Valid data: ${data}`);
                await this.outgoing.string(data);
            } else if (this.validationIsFatal) {
                this.logger.warn("Validation failed and is fatal.");
                throw ShaclError.validationFailed();
            } else if (this.report) {
                const resultRaw = this.serializer.transform(result.dataset);
                await this.report.string(resultRaw);
                this.logger.debug("Validation failed, report generated.");
            }
        }

        // Close the outgoing streams.
        await this.outgoing.close();
        if (this.report) {
            await this.report.close();
        }
        this.logger.debug("Outgoing streams are closed.");
    }

    async produce(this: ValidateArgs & this): Promise<void> {
        // nothing
    }
}
