# shacl-processor-ts

[![Build and tests with Node.js](https://github.com/rdf-connect/shacl-processor-ts/actions/workflows/build-test.yml/badge.svg)](https://github.com/rdf-connect/shacl-processor-ts/actions/workflows/build-test.yml)

Validate data streams using SHACL.

## Functions

### [`validate`](./src/index.ts)

Validate an incoming data stream using SHACL. If the incoming data is valid, it is sent unchanged into the outgoing stream. Otherwise, the SHACL validation report is sent into an optional `report` channel for further investigation.

- `path`: a local file path which points to a SHACL definition.
- `incoming`: channel which is used as the data source.
- `outgoing`: channel into which valid data is written.
- `report`: an optional channel into which the SHACL reports of invalid input data is written. (default: `null`)

## Limitations

At the time of writing, all files are read and serialized in the Turtle format. Additional options may be available in the future.
