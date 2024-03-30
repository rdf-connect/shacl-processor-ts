import { describe, test, expect } from "vitest";
import { validate } from "../src";
import { SimpleStream } from "@ajuvercr/js-runner";
import { ShaclError } from "../src/error";

describe("errors", () => {
    test("invalid shacl file path", async () => {
        expect.assertions(1);

        const func = validate({
            path: "/tmp/shacl-doesnt-exist.ttl",
            incoming: new SimpleStream<string>(),
            outgoing: new SimpleStream<string>(),
        });

        expect(func).rejects.toThrow(ShaclError.fileSystemError());
    });

    test("invalid shacl rdf format", async () => {
        expect.assertions(1);

        const func = validate({
            path: "./tests/shacl/invalid.ttl",
            incoming: new SimpleStream<string>(),
            outgoing: new SimpleStream<string>(),
        });

        expect(func).rejects.toThrow(ShaclError.invalidRdfFormat());
    });
});
