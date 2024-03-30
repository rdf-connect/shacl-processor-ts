declare module "shacl-engine" {
    import DatasetCore from "@rdfjs/dataset/DatasetCore";
    import { Quad } from "@rdfjs/types";
    import DataFactory from "@rdfjs/data-model/Factory";

    class Shape {
        constructor(
            ptr: never,
            options: {
                validator: never;
            },
        );
    }

    type Result = {
        args: never;
    };

    type Report = {
        results: Array<Result>;
        conforms: boolean;
        dataset: DatasetCore; // TODO: check
        ptr: never; // TODO: check
        term: never; // TODO: check
        build: () => never; // TODO: check
        coverage: () => never; // TODO: check
    };

    class Validator {
        constructor(
            dataset: DatasetCore,
            options: {
                coverage?: boolean;
                debug?: boolean;
                details?: boolean;
                factory: DataFactory;
                trace?: boolean;
            },
        );

        validate: (data: {
            dataset: DatasetCore;
            terms?: Array<Quad>;
        }) => Promise<Report>;
    }
}
