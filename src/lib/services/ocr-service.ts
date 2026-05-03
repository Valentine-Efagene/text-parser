import type { OcrParseResult } from "@/lib/ocr-parser";

export class OcrServiceError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.name = "OcrServiceError";
    }
}

export type OcrApiResponse = {
    fileName: string;
    mimeType: string;
    rawText: string;
    parsed: OcrParseResult;
    meta: {
        charCount: number;
        lineCount: number;
        formFieldCount: number;
    };
};

export function buildOcrResponse(
    file: File,
    rawText: string,
    parsed: OcrParseResult,
): OcrApiResponse {
    return {
        fileName: file.name,
        mimeType: file.type,
        rawText,
        parsed,
        meta: {
            charCount: rawText.length,
            lineCount: parsed.lines.length,
            formFieldCount: parsed.formFields.length,
        },
    };
}

export async function getUploadedFileFromRequest(
    request: Request,
    fileType: "image" | "image-or-pdf",
): Promise<File> {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        throw new OcrServiceError(400, "No file uploaded.");
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_FILE_SIZE) {
        throw new OcrServiceError(413, `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (fileType === "image" && !isImage) {
        throw new OcrServiceError(
            400,
            "OpenAI Vision supports images only. Please upload an image file.",
        );
    }

    if (fileType === "image-or-pdf" && !(isImage || isPdf)) {
        throw new OcrServiceError(
            400,
            "Unsupported file type. Please upload an image or PDF.",
        );
    }

    return file;
}
