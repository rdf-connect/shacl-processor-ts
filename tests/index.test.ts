import { describe, test, expect, beforeEach } from "vitest";
import * as fs from "fs";
import { channel, createRunner } from "@rdfc/js-runner/lib/testUtils";
import { FullProc } from "@rdfc/js-runner";
import { Validate } from "../src";
import { createLogger, transports } from "winston";

// Valid point.
const validRdfData = fs.readFileSync("./tests/data/valid.ttl").toString();
const validNTriples = fs.readFileSync("./tests/data/valid.nt").toString();

// Invalid point.
const invalidRdfData = fs.readFileSync("./tests/data/invalid.ttl").toString();
const invalidRdfReport = fs
    .readFileSync("./tests/data/invalid.report.ttl")
    .toString();

const unknownRdfData = fs.readFileSync("./tests/data/square.ttl").toString();

// SHACL data.
const shaclPath = "./tests/shacl/point.ttl";

const logger = createLogger({
    transports: new transports.Console({
        level: process.env["DEBUG"] || "info",
    }),
});
let inputWriter: ReturnType<typeof channel>[0];
let inputReader: ReturnType<typeof channel>[1];
let outputWriter: ReturnType<typeof channel>[0];
let outputReader: ReturnType<typeof channel>[1];
let reportWriter: ReturnType<typeof channel>[0];
let reportReader: ReturnType<typeof channel>[1];

let proc: FullProc<Validate>;
let transformPromise: Promise<void>;

// Utility: collect all messages from a reader
async function collect(reader: typeof outputReader): Promise<string[]> {
    const collected: string[] = [];
    for await (const msg of reader.strings()) {
        collected.push(msg);
    }
    return collected;
}

beforeEach(async () => {
    const runner = createRunner();
    [inputWriter, inputReader] = channel(runner, "input");
    [outputWriter, outputReader] = channel(runner, "output");
    [reportWriter, reportReader] = channel(runner, "report");

    proc = <FullProc<Validate>>new Validate(
        {
            shaclPath,
            incoming: inputReader,
            outgoing: outputWriter,
            report: reportWriter,
        },
        logger,
    );

    await proc.init();
    transformPromise = proc.transform();
});

describe("shacl", () => {
    test("successful", async () => {
        expect.assertions(2);

        inputWriter.string(validRdfData);
        inputWriter.close();

        const [outCollected, repCollected] = await Promise.all([
            collect(outputReader),
            collect(reportReader),
        ]);
        await transformPromise;

        expect(outCollected.join("")).toEqual(validRdfData);
        expect(repCollected.join("")).toEqual("");
    });

    test("invalid", async () => {
        expect.assertions(2);

        inputWriter.string(invalidRdfData);
        inputWriter.close();

        const [outCollected, repCollected] = await Promise.all([
            collect(outputReader),
            collect(reportReader),
        ]);
        await transformPromise;

        expect(outCollected.join("")).toEqual("");
        expect(repCollected.join("")).toEqual(invalidRdfReport);
    });

    test("unknown", async () => {
        expect.assertions(2);

        inputWriter.string(unknownRdfData);
        inputWriter.close();

        const [outCollected, repCollected] = await Promise.all([
            collect(outputReader),
            collect(reportReader),
        ]);
        await transformPromise;

        expect(outCollected.join("")).toEqual(unknownRdfData);
        expect(repCollected.join("")).toEqual("");
    });
});

describe("shacl - config", () => {
    test("mime", async () => {
        expect.assertions(2);

        const runner = createRunner();
        [inputWriter, inputReader] = channel(runner, "input");
        [outputWriter, outputReader] = channel(runner, "output");
        [reportWriter, reportReader] = channel(runner, "report");

        proc = <FullProc<Validate>>new Validate(
            {
                shaclPath,
                incoming: inputReader,
                outgoing: outputWriter,
                report: reportWriter,
                mime: "application/n-triples",
            },
            logger,
        );

        await proc.init();

        transformPromise = proc.transform();

        inputWriter.string(validNTriples);
        inputWriter.close();

        const [outCollected, repCollected] = await Promise.all([
            collect(outputReader),
            collect(reportReader),
        ]);
        await transformPromise;

        expect(outCollected.join("")).toEqual(validNTriples);
        expect(repCollected.join("")).toEqual("");
    });
});
