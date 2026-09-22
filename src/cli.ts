#!/usr/bin/env node
// shacl-validate: the `Validate` processor as a command-line tool.
//
// Input and output are NDJSON: each line a JSON string holding RDF (N-Quads
// by default) for one or more records.
//
//   streaming (default)  every line is one unit, validated on its own.
//   --batch              all lines are one unit, validated once.
//
// Exactly the processor's rule: a unit that conforms is forwarded verbatim to
// stdout (the processor's `outgoing`); a unit that does not is dropped, and its
// validation report goes to --report (the processor's `report`), one NDJSON
// line per report.
//
// No state is kept beyond what one process needs: shapes are loaded once per
// invocation, exactly like the processor's init().
import { createInterface } from "readline";
import { createWriteStream, WriteStream } from "fs";
import { once } from "events";
import { Readable, Writable } from "stream";
import { parseArgs } from "util";
import rdf from "rdf-ext";
import type { DatasetCore } from "@rdfjs/types";
import { ShaclError } from "./error.js";
import {
    createReportSerializer,
    getParser,
    loadValidator,
    parseDataset,
} from "./core.js";

const USAGE = `Usage: shacl-validate --shapes <file> [--mime <type>] [--report <file>] [--fatal] [--batch]

Reads NDJSON (each line a JSON string of RDF) from stdin and writes what
conforms to stdout.

  --shapes <file>   SHACL shapes graph (required)
  --mime <type>     RDF format of each record (default: application/n-quads)
  --report <file>   write the report of every non-conforming unit here (NDJSON)
  --fatal           exit with status 1 on the first non-conforming line
  --batch           validate all lines as one dataset in a single validation
  -h, --help        show this help`;

const { values: opts } = parseArgs({
    options: {
        shapes: { type: "string" },
        mime: { type: "string", default: "application/n-quads" },
        report: { type: "string" },
        fatal: { type: "boolean", default: false },
        batch: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
    },
});

if (opts.help) {
    console.log(USAGE);
    process.exit(0);
}
if (!opts.shapes) {
    console.error(USAGE);
    process.exit(2);
}

async function write(out: Writable, chunk: string) {
    if (!out.write(chunk)) {
        await once(out, "drain");
    }
}

async function closeStream(out: WriteStream | undefined) {
    if (out) {
        await new Promise((resolve) => out.end(resolve));
    }
}

function lines(): AsyncIterable<string> {
    return createInterface({ input: process.stdin, crlfDelay: Infinity });
}

function recordContent(line: string): string {
    const content = JSON.parse(line);
    if (typeof content !== "string") {
        throw new Error("Expected every NDJSON line to be a JSON string");
    }
    return content;
}

async function main() {
    const serializer = createReportSerializer();
    const parser = getParser(opts.mime!);
    const validator = await loadValidator(opts.shapes!);
    const report = opts.report ? createWriteStream(opts.report) : undefined;
    const out = process.stdout;

    const reject = async (reportDataset: DatasetCore) => {
        if (report) {
            const turtle = serializer.transform(reportDataset);
            await write(report, JSON.stringify(turtle) + "\n");
        }
        if (opts.fatal) {
            await closeStream(report);
            throw ShaclError.validationFailed();
        }
    };

    // Validates `lines` as one unit: forwarded if it conforms, rejected if not.
    const validateUnit = async (lines: string[]) => {
        // Each line is parsed on its own so blank node labels stay scoped to it.
        const parsed = [];
        for (const line of lines) {
            parsed.push(
                await parseDataset(
                    parser,
                    Readable.from([recordContent(line)]),
                ),
            );
        }
        const dataset =
            parsed.length === 1
                ? parsed[0]
                : rdf.dataset().addAll(parsed.flatMap((d) => [...d]));

        const result = await validator.validate({ dataset });
        if (result.conforms) {
            for (const line of lines) await write(out, line + "\n");
        } else {
            await reject(result.dataset);
        }
    };

    if (!opts.batch) {
        for await (const line of lines()) {
            if (line.trim()) await validateUnit([line]);
        }
    } else {
        const all: string[] = [];
        for await (const line of lines()) {
            if (line.trim()) all.push(line);
        }
        await validateUnit(all);
    }

    await closeStream(report);
}

main().catch((err) => {
    console.error(`shacl-validate: ${err.message ?? err}`);
    process.exitCode = 1;
});
