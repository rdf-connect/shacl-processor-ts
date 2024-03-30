import { validate } from "../src";
import { SimpleStream } from "@ajuvercr/js-runner";
import { describe, test, expect } from "vitest";
import * as fs from "fs";

describe("shacl", () => {
    // Valid point.
    const valid = fs.readFileSync("./tests/data/valid.ttl").toString();
    const validReport = fs
        .readFileSync("./tests/data/valid.report.ttl")
        .toString();

    // Invalid point.
    const invalid = fs.readFileSync("./tests/data/invalid.ttl").toString();
    const invalidReport = fs
        .readFileSync("./tests/data/invalid.report.ttl")
        .toString();

    // SHACL data.
    const shapePath = "./tests/shacl/point.ttl";

    test("successful", async () => {
        expect.assertions(2);

        // Function parameters.
        const incoming = new SimpleStream<string>();
        const outgoing = new SimpleStream<string>();
        const report = new SimpleStream<string>();

        outgoing.on("data", (data) => {
            expect(data).toEqual(valid);
        });

        report.on("data", (data) => {
            expect(data).toEqual(validReport);
        });

        // Initialize and execute the function.
        const func = await validate(shapePath, incoming, outgoing, report);
        await func();

        // Send point into the pipeline.
        await incoming.push(valid);

        // Finish testing.
        await incoming.end();
        await outgoing.end();
        await report.end();
    });

    test("invalid", async () => {
        expect.assertions(1);

        // Function parameters.
        const incoming = new SimpleStream<string>();
        const outgoing = new SimpleStream<string>();
        const error = new SimpleStream<string>();

        outgoing.on("data", () => {
            expect(true).toBeFalsy();
        });

        error.on("data", (data) => {
            expect(data).toEqual(invalidReport);
        });

        // Initialize and execute the function.
        const func = await validate(shapePath, incoming, outgoing, error);
        await func();

        // Send point into the pipeline.
        await incoming.push(invalid);

        // Finish testing.
        await incoming.end();
        await outgoing.end();
        await error.end();
    });
});
