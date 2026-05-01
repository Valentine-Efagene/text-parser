import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

import { parseDocumentAiFormFields, parseOcrText } from "@/lib/ocr-parser";
import { buildOcrResponse, OcrServiceError } from "@/lib/services/ocr-service";

let cachedClient: DocumentProcessorServiceClient | null = null;

function getDocumentAiClient(location: string): DocumentProcessorServiceClient {
    if (cachedClient) {
        return cachedClient;
    }

    const base64Credentials = process.env.GOOGLE_DOCUMENT_AI_CREDENTIALS_BASE64;
    const apiEndpoint = `${location}-documentai.googleapis.com`;

    if (base64Credentials) {
        const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8");
        const credentials = JSON.parse(decoded) as {
            client_email: string;
            private_key: string;
            project_id?: string;
        };

        cachedClient = new DocumentProcessorServiceClient({
            apiEndpoint,
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key,
            },
            projectId: credentials.project_id,
        });

        return cachedClient;
    }

    cachedClient = new DocumentProcessorServiceClient({ apiEndpoint });
    return cachedClient;
}

export async function processWithDocumentAi(file: File) {
    const projectId = process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID;
    const location = process.env.GOOGLE_DOCUMENT_AI_LOCATION ?? "us";
    const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;
    const processorVersion = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_VERSION;

    if (!projectId || !processorId) {
        throw new OcrServiceError(
            500,
            "Missing Document AI configuration. Set GOOGLE_DOCUMENT_AI_PROJECT_ID and GOOGLE_DOCUMENT_AI_PROCESSOR_ID.",
        );
    }

    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const client = getDocumentAiClient(location);

    const processorPath = processorVersion
        ? `projects/${projectId}/locations/${location}/processors/${processorId}/processorVersions/${processorVersion}`
        : `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const [result] = await client.processDocument({
        name: processorPath,
        rawDocument: {
            content: imageBuffer.toString("base64"),
            mimeType: file.type || "application/octet-stream",
        },
    });

    const document = result.document;
    const rawText = document?.text?.trim() ?? "";
    const formFields = parseDocumentAiFormFields(
        rawText,
        document?.pages?.flatMap((page) => page.formFields ?? []) ?? [],
    );
    const parsed = parseOcrText(rawText, formFields);

    return buildOcrResponse(file, rawText, parsed);
}
