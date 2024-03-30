import { describe, test, expect } from "vitest";
import { validate } from "../src";
import { SimpleStream } from "@ajuvercr/js-runner";
import { ShaclError } from "../src/error";
import fs from "fs";

const shaclPath = "./tests/shacl/point.ttl";

const invalidRdfData = fs.readFileSync("./tests/data/invalid.ttl").toString();

describe("errors", () => {
    test("invalid shacl file path", async () => {
        expect.assertions(1);

        const func = validate({
            shaclPath: "/tmp/shacl-doesnt-exist.ttl",
            incoming: new SimpleStream<string>(),
            outgoing: new SimpleStream<string>(),
        });

        expect(func).rejects.toThrow(ShaclError.fileSystemError());
    });

    test("invalid shacl rdf format", async () => {
        expect.assertions(1);

        const func = validate({
            shaclPath: "./tests/shacl/invalid.ttl",
            incoming: new SimpleStream<string>(),
            outgoing: new SimpleStream<string>(),
        });

        expect(func).rejects.toThrow(ShaclError.invalidRdfFormat());
    });

    test("invalid input data", async () => {
        expect.assertions(1);

        const incoming = new SimpleStream<string>();
        const outgoing = new SimpleStream<string>();

        const func = await validate({
            shaclPath,
            incoming,
            outgoing,
        });
        await func();

        expect(
            incoming.push("This is not a valid Turtle file!"),
        ).rejects.toThrow(ShaclError.invalidRdfFormat());

        await incoming.end();
        await outgoing.end();
    });

    test("invalid and fatal", async () => {
        expect.assertions(1);

        const incoming = new SimpleStream<string>();

        const func = await validate({
            shaclPath,
            incoming,
            outgoing: new SimpleStream<string>(),
            validationIsFatal: true,
        });
        await func();

        expect(incoming.push(invalidRdfData)).rejects.toThrow(
            ShaclError.validationFailed(),
        );

        await incoming.end();
    });
});
