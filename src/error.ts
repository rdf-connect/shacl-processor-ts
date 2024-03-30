enum ShaclErrorType {
    FileSystemError,
    InvalidRdfFormat,
    ValidationFailed,
}

export class ShaclError extends Error {
    readonly type: ShaclErrorType;

    constructor(message: string, type: ShaclErrorType) {
        super(message);
        this.name = "ShaclError";
        this.type = type;
    }

    static fileSystemError() {
        return new ShaclError(
            "Error when interacting with file system",
            ShaclErrorType.FileSystemError,
        );
    }

    static invalidRdfFormat() {
        return new ShaclError(
            "Invalid RDF format",
            ShaclErrorType.InvalidRdfFormat,
        );
    }

    static validationFailed() {
        return new ShaclError(
            "Validation failed and is fatal.",
            ShaclErrorType.ValidationFailed,
        );
    }
}
