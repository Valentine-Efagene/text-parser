import { NextResponse } from "next/server";

import {
    getUploadedFileFromRequest,
    OcrServiceError,
} from "@/lib/services/ocr-service";
import { processWithOpenAi } from "@/lib/services/openai-ocr-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const file = await getUploadedFileFromRequest(request, "image-or-pdf");
        const payload = await processWithOpenAi(file);
        return NextResponse.json(payload);
    } catch (error) {
        if (error instanceof OcrServiceError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error("OpenAI OCR failed:", error);
        return NextResponse.json(
            { error: "OpenAI processing failed. Check your API key and try again." },
            { status: 500 },
        );
    }
}
