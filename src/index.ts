import { Readable } from "stream";
import Serializer from "@rdfjs/serializer-turtle";
import { Validator } from "shacl-engine";
import { ShaclError } from "./error.js";
import { Processor, Reader, Writer } from "@rdfc/js-runner";
import { teeAsync } from "./utils.js";
import {
    createReportSerializer,
    getParser,
    loadValidator,
    parseDataset,
    Parser,
} from "./core.js";

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
    protected parser: Parser | undefined;
    protected validator: Validator;

    async init(this: ValidateArgs & this): Promise<void> {
        // Default arguments.
        this.mime = this.mime ?? "text/turtle";
        this.validationIsFatal = this.validationIsFatal ?? false;

        // Initialize the shared serializer.
        this.serializer = createReportSerializer();
        this.logger.debug("Serializer is initialized.");

        // Initialize the data parser.
        this.parser = getParser(this.mime);
        this.logger.debug("Parser is initialized.");

        // Load the shapes and build the validator from them.
        this.validator = await loadValidator(this.shaclPath);
        this.logger.debug("Validator is initialized.");
    }

    async transform(this: ValidateArgs & this): Promise<void> {
        for await (const data of this.incoming.streams()) {
            // Tee the async generator so we can consume twice.
            const [forValidation, forForwarding] = teeAsync(data);

            // Parse data into a dataset.
            const dataset = await parseDataset(
                this.parser!,
                Readable.from(forValidation),
            );

            // Run through validator.
            const result = await this.validator.validate({ dataset });

            // Pass through data if valid.
            if (result.conforms) {
                this.logger.debug("Forwarding valid data.");
                await this.outgoing.stream(forForwarding);
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
