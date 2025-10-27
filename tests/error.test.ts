import { describe, test, expect } from "vitest";
import { ShaclError } from "../src/error";
import { Validate } from "../src";
import { channel, createRunner } from "@rdfc/js-runner/lib/testUtils";
import { FullProc } from "@rdfc/js-runner";
import fs from "fs";
import { createLogger, transports } from "winston";

const shaclPath = "./tests/shacl/point.ttl";
const validJsonLd = fs.readFileSync("./tests/data/valid.jsonld").toString();
const invalidRdfData = fs.readFileSync("./tests/data/invalid.ttl").toString();

const logger = createLogger({
    transports: new transports.Console({
        level: process.env["DEBUG"] || "info",
    }),
});
describe("Validate processor error handling", () => {
    test("invalid shacl file path", async () => {
        expect.assertions(1);

        const runner = createRunner();
        const [inputWriter, inputReader] = channel(runner, "input");
        const [outputWriter, outputReader] = channel(runner, "output");

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

        const runner = createRunner();
        const [inputWriter, inputReader] = channel(runner, "input");
        const [outputWriter, outputReader] = channel(runner, "output");

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

        const runner = createRunner();
        const [inputWriter, inputReader] = channel(runner, "input");
        const [outputWriter, outputReader] = channel(runner, "output");

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

        const runner = createRunner();
        const [inputWriter, inputReader] = channel(runner, "input");
        const [outputWriter, outputReader] = channel(runner, "output");

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
        inputWriter.string("This is not a valid Turtle file!");
        inputWriter.close();
        await expect(prom).rejects.toThrow(ShaclError.invalidRdfFormat());
    });

    test("invalid and fatal", async () => {
        expect.assertions(1);

        const runner = createRunner();
        const [inputWriter, inputReader] = channel(runner, "input");
        const [outputWriter, outputReader] = channel(runner, "output");

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
        inputWriter.string(invalidRdfData);
        inputWriter.close();
        await expect(prom).rejects.toThrow(ShaclError.validationFailed());
    });

    test("incorrect mime (JSON-LD with turtle mime)", async () => {
        expect.assertions(1);

        const runner = createRunner();
        const [inputWriter, inputReader] = channel(runner, "input");
        const [outputWriter, outputReader] = channel(runner, "output");

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

        inputWriter.string(validJsonLd);
        inputWriter.close();
        await expect(prom).rejects.toThrow(ShaclError.invalidRdfFormat());
    });
});
