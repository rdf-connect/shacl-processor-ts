# shacl-processor-ts

[![Build and tests with Node.js](https://github.com/rdf-connect/shacl-processor-ts/actions/workflows/build-test.yml/badge.svg)](https://github.com/rdf-connect/shacl-processor-ts/actions/workflows/build-test.yml) [![npm](https://img.shields.io/npm/v/@rdfc/shacl-processor-ts.svg?style=popout)](https://npmjs.com/package/@rdfc/shacl-processor-ts)

Validate data streams using SHACL.

## Functions

### [`validate`](./src/index.ts)

Validate an incoming data stream using SHACL. If the incoming data is valid, it is sent unchanged into the outgoing stream. Otherwise, the SHACL validation report is sent into an optional `report` channel for further investigation.

- `shaclPath`: a local file path which points to a SHACL definition.
- `incoming`: channel which is used as the data source.
- `outgoing`: channel into which valid data is written.
- `report`: an optional channel into which the SHACL reports of invalid input data is written. (default: `null`)
- `validationIsFatal`: throw a fatal error if validation fails. (default: `false`)
- `mime`: the internet media type of the incoming data used to initialize the parser. (default: `text/turtle`)

## Limitations

The file type of the incoming data must be known beforehand and be set using the `mime` parameter in order to initialize the parser. Type agnostic parsers may be available in the feature, making this setting redundant.

SHACL reports are outputted in Turtle using humanized formatting. Prefixes are hard coded for the time being. Ideally, these should be based on the prefixes used in the input data, or omitted at the user's request. Other file types should be made available as well.

```ts
const prefixes = new PrefixMapFactory().prefixMap();
prefixes.set("sh", rdf.namedNode("http://www.w3.org/ns/shacl#"));
```
