import { describe, test, expect } from "vitest";
import { ShaclError } from "../src/error";
import { Validate } from "../src";
import { createWriter, logger } from "@rdfc/js-runner/lib/testUtils";
import { FullProc } from "@rdfc/js-runner";
import fs from "fs";

const shaclPath = "./tests/shacl/point.ttl";
const validJsonLd = fs.readFileSync("./tests/data/valid.jsonld").toString();
const invalidRdfData = fs.readFileSync("./tests/data/invalid.ttl").toString();

describe("Validate processor error handling", () => {
    test("invalid shacl file path", async () => {
        expect.assertions(1);

        const [inputWriter, inputReader] = createWriter();
        const [outputWriter] = createWriter();

        const proc = <FullProc<Validate>>new Validate(
            {
                shaclPath: "/tmp/shacl-doesnt-exist.ttl",
                incoming: inputReader,
                outgoing: outputWriter,
            },
            logger,
        );

        await expect(proc.init()).rejects.toThrow(ShaclError.fileSystemError());
    });

    test("invalid data rdf format", async () => {
        expect.assertions(1);

        const [inputWriter, inputReader] = createWriter();
        const [outputWriter] = createWriter();

        const proc = <FullProc<Validate>>new Validate(
            {
                shaclPath,
                incoming: inputReader,
                outgoing: outputWriter,
                mime: "text/invalid",
            },
            logger,
        );

        await expect(proc.init()).rejects.toThrow(
            ShaclError.invalidRdfFormat(),
        );
    });

    test("invalid shacl rdf format", async () => {
        expect.assertions(1);

        const [inputWriter, inputReader] = createWriter();
        const [outputWriter] = createWriter();

        const proc = <FullProc<Validate>>new Validate(
            {
                shaclPath: "./tests/shacl/invalid.ttl",
                incoming: inputReader,
                outgoing: outputWriter,
            },
            logger,
        );

        await expect(proc.init()).rejects.toThrow(
            ShaclError.invalidRdfFormat(),
        );
    });

    test("invalid input data", async () => {
        expect.assertions(1);

        const [inputWriter, inputReader] = createWriter();
        const [outputWriter] = createWriter();

        const proc = <FullProc<Validate>>new Validate(
            {
                shaclPath,
                incoming: inputReader,
                outgoing: outputWriter,
            },
            logger,
        );

        await proc.init();
        const prom = proc.transform();
        await inputWriter.string("This is not a valid Turtle file!");
        await inputWriter.close();
        await expect(prom).rejects.toThrow(ShaclError.invalidRdfFormat());
    });

    test("invalid and fatal", async () => {
        expect.assertions(1);

        const [inputWriter, inputReader] = createWriter();
        const [outputWriter] = createWriter();

        const proc = <FullProc<Validate>>new Validate(
            {
                shaclPath,
                incoming: inputReader,
                outgoing: outputWriter,
                validationIsFatal: true,
            },
            logger,
        );

        await proc.init();
        const prom = proc.transform();
        await inputWriter.string(invalidRdfData);
        await inputWriter.close();
        await expect(prom).rejects.toThrow(ShaclError.validationFailed());
    });

    test("incorrect mime (JSON-LD with turtle mime)", async () => {
        expect.assertions(1);

        const [inputWriter, inputReader] = createWriter();
        const [outputWriter] = createWriter();

        const proc = <FullProc<Validate>>new Validate(
            {
                shaclPath,
                incoming: inputReader,
                outgoing: outputWriter,
                mime: "text/turtle", // force wrong parser
            },
            logger,
        );

        await proc.init();
        const prom = proc.transform();

        await inputWriter.string(validJsonLd);
        await inputWriter.close();
        await expect(prom).rejects.toThrow(ShaclError.invalidRdfFormat());
    });
});
