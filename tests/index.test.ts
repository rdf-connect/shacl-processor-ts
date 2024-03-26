import { validate } from "../src";
import { SimpleStream } from "@ajuvercr/js-runner";
import { describe, test, expect } from "@jest/globals";

describe("shacl", () => {
    test("successful", async () => {
        expect.assertions(2);

        // Function parameters.
        const path =
            "/Users/jens/Developer/com.imec.shacl-validate-processor.ts/tests/shacl/point.ttl";
        const incoming = new SimpleStream<string>();
        const outgoing = new SimpleStream<string>();
        const error = new SimpleStream<string>();

        // A valid point shape.
        const point = `
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        [ ] a <point>;
          <x> "1"^^xsd:integer;
          <y> "2"^^xsd:integer.
        `;

        // An invalid point shape.
        const invalid = `
        @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

        [ ] a <point>;
          <a> "3"^^xsd:integer;
          <b> "4"^^xsd:integer.
        `;

        // Set expected data.
        outgoing.on("data", (data) => expect(data).toEqual(point));
        error.on("data", (data) => expect(data).toEqual(invalid));

        // Initialize and execute the function.
        const func = await validate(path, incoming, outgoing, error);
        await func();

        // Send point into the pipeline.
        await incoming.push(point);
        await incoming.push(invalid);

        // Finish testing.
        await incoming.end();
        await outgoing.end();
        await error.end();
    });
});
