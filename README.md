# shacl-processor-ts

[![Build and tests with Node.js](https://github.com/rdf-connect/shacl-processor-ts/actions/workflows/build-test.yml/badge.svg)](https://github.com/rdf-connect/shacl-processor-ts/actions/workflows/build-test.yml) [![npm](https://img.shields.io/npm/v/@rdfc/shacl-processor-ts.svg?style=popout)](https://npmjs.com/package/@rdfc/shacl-processor-ts)

Validate RDF data streams using SHACL.

This processor validates an incoming RDF data stream against a SHACL shapes graph.  
If the incoming data is valid, it is forwarded unchanged to the outgoing channel.  
If invalid, the processor emits a SHACL validation report to an optional report channel.

---

## Usage

### Installation

```bash
npm install
npm run build
```

Or install from NPM:

```bash
npm install @rdfc/shacl-processor-ts
```

---

### Pipeline Configuration Example

```turtle
@prefix rdfc: <https://w3id.org/rdf-connect#>.
@prefix owl: <http://www.w3.org/2002/07/owl#>.

### Import the processor definitions
<> owl:imports <./node_modules/@rdfc/shacl-processor-ts/processors.ttl>.

### Define the channels your processor needs
<in> a rdfc:Reader.
<out> a rdfc:Writer.
<report> a rdfc:Writer.

### Attach the processor to the pipeline under the NodeRunner
# Add the `rdfc:processor <validator>` statement under the `rdfc:consistsOf` statement of the `rdfc:NodeRunner`

### Define and configure the processors
<validator> a rdfc:Validate;
    rdfc:shaclPath "./shapes/example-shapes.ttl";
    rdfc:incoming <in>;
    rdfc:outgoing <out>;
    rdfc:report <report>;
    rdfc:validationIsFatal false;
    rdfc:mime "text/turtle".
```

---

## Configuration

Parameters of `rdfc:Validate`:

- `rdfc:shaclPath` (**string**, required): Local file path to the SHACL shapes graph.
- `rdfc:incoming` (**rdfc:Reader**, required): The input channel with RDF data to validate.
- `rdfc:outgoing` (**rdfc:Writer**, required): The output channel for valid RDF data.
- `rdfc:report` (**rdfc:Writer**, optional): Output channel for SHACL validation reports. Defaults to none.
- `rdfc:validationIsFatal` (**boolean**, optional): If true, throws a fatal error when validation fails. Default: `false`.
- `rdfc:mime` (**string**, optional): MIME type of the incoming data (e.g., `text/turtle`, `application/ld+json`). Default: `text/turtle`.

---

## Limitations

- The file type of the incoming RDF data must be specified via the `mime` parameter to initialize the correct parser.
- SHACL validation reports are currently outputted in Turtle with fixed prefixes. Ideally, prefixes should reflect those used in the input data or be configurable.
- Additional output formats for validation reports may be supported in future releases.

---

## Example

```turtle
<validator> a rdfc:Validate;
    rdfc:shaclPath "./shapes/person-shapes.ttl";
    rdfc:incoming <in>;
    rdfc:outgoing <out>;
    rdfc:report <report>;
    rdfc:mime "text/turtle".
```
