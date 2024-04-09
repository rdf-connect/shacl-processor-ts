import { describe, test, expect } from "vitest";
import { validate } from "../src";
import { SimpleStream } from "@ajuvercr/js-runner";
import { ShaclError } from "../src/error";
import fs from "fs";

// Parse input files beforehand and share among tests.
const shaclPath = "./tests/shacl/point.ttl";
const validJsonLd = fs.readFileSync("./tests/data/valid.jsonld").toString();
const invalidRdfData = fs.readFileSync("./tests/data/invalid.ttl").toString();

// These streams can be used as a fallback, and shouldn't contain any tested
// data.
const incoming = new SimpleStream<string>();
const outgoing = new SimpleStream<string>();

describe("errors", () => {
    test("invalid shacl file path", async () => {
        expect.assertions(1);

        const func = validate({
            shaclPath: "/tmp/shacl-doesnt-exist.ttl",
            incoming,
            outgoing,
        });

        expect(func).rejects.toThrow(ShaclError.fileSystemError());
    });

    test("invalid data rdf format", async () => {
        expect.assertions(1);

        const func = validate({
            shaclPath,
            incoming,
            outgoing,
            mime: "text/invalid",
        });

        expect(func).rejects.toThrowError(ShaclError.invalidRdfFormat());
    });

    test("invalid shacl rdf format", async () => {
        expect.assertions(1);

        const func = validate({
            shaclPath: "./tests/shacl/invalid.ttl",
            incoming,
            outgoing,
        });

        expect(func).rejects.toThrowError(ShaclError.invalidRdfFormat());
    });

    test("invalid input data", async () => {
        expect.assertions(1);

        await validate({
            shaclPath,
            incoming,
            outgoing,
        });

        expect(
            incoming.push("This is not a valid Turtle file!"),
        ).rejects.toThrow(ShaclError.invalidRdfFormat());
    });

    test("invalid and fatal", async () => {
        expect.assertions(1);

        await validate({
            shaclPath,
            incoming,
            outgoing,
            validationIsFatal: true,
        });

        expect(incoming.push(invalidRdfData)).rejects.toThrow(
            ShaclError.validationFailed(),
        );
    });

    test("incorrect mime", async () => {
        expect.assertions(1);

        await validate({
            shaclPath,
            incoming,
            outgoing,
            mime: "text/turtle",
        });

        expect(async () => {
            await incoming.push(validJsonLd);
        }).rejects.toThrow(ShaclError.invalidRdfFormat());
    });
});
