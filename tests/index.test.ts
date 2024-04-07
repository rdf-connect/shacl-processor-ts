import { validate } from "../src";
import { SimpleStream } from "@ajuvercr/js-runner";
import { describe, test, expect, beforeEach } from "vitest";
import * as fs from "fs";
import { ShaclError } from "../src/error";

// Channel which streams incoming RDF.
let incoming: SimpleStream<string>;

// Output channel, if successful.
let outgoing: SimpleStream<string>;
let outgoingData: string;

// Reporting channel, if invalid shape is found.
let report: SimpleStream<string>;
let reportData: string;

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

// Utility function which waits for all streams to settle.
async function endAll(): Promise<void> {
    await incoming.end();
    await outgoing.end();
    await report.end();
}

beforeEach(async () => {
    // Reset and start the streams.
    incoming = new SimpleStream<string>();
    outgoing = new SimpleStream<string>();
    report = new SimpleStream<string>();

    // Reset the data itself.
    outgoingData = "";
    reportData = "";

    // Reinitialize the data handlers.
    outgoing.on("data", (data) => {
        outgoingData += data;
    });

    report.on("data", (data) => {
        reportData += data;
    });
});

describe("shacl", () => {
    beforeEach(async () => {
        // Restart the processor, which is the same for each test.
        const func = await validate({
            shaclPath,
            incoming,
            outgoing,
            report,
        });
        func();
    });

    test("successful", async () => {
        expect.assertions(2);

        await incoming.push(validRdfData);
        await endAll();

        expect(outgoingData).toEqual(validRdfData);
        expect(reportData).toEqual("");
    });

    test("invalid", async () => {
        expect.assertions(2);

        await incoming.push(invalidRdfData);
        await endAll();

        expect(outgoingData).toEqual("");
        expect(reportData).toEqual(invalidRdfReport);
    });

    test("unknown", async () => {
        expect.assertions(2);

        await incoming.push(unknownRdfData);
        await endAll();

        expect(outgoingData).toEqual(unknownRdfData);
        expect(reportData).toEqual("");
    });
});

describe("shacl - config", () => {
    test("mime", async () => {
        expect.assertions(2);

        const func = await validate({
            shaclPath,
            incoming,
            outgoing,
            report,
            mime: "application/n-triples",
        });
        func();

        await incoming.push(validNTriples);
        await endAll();

        expect(outgoingData).toEqual(validNTriples);
        expect(reportData).toEqual("");
    });
});
