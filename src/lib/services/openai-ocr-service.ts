import OpenAI from "openai";

import { parseOcrText } from "@/lib/ocr-parser";
import { buildOcrResponse, OcrServiceError } from "@/lib/services/ocr-service";

const EXPECTED_TITLES = [
    "CUSTOMER APPLICATION FORM",
    "PERSONAL INFORMATION",
    "NEXT OF KIN (NOK) INFORMATION",
] as const;

const EXPECTED_FIELDS = [
    "Title",
    "Surname",
    "First Name",
    "Middle Name",
    "Email",
    "Gender",
    "Date of Birth",
    "Nationality",
    "State of Origin",
    "Phone Number",
    "Home Address",
    "Valid Means of ID",
    "Employment Type",
    "Name of Employer/Business",
    "Years in Employment/Business",
    "Occupation",
    "Salary/Monthly Turnover",
    "Year of Employment",
    "Grade Level",
    "Full Name of NOK",
    "Contact of NOK",
    "Address of NOK",
] as const;

const ADAPTIVE_RULES = {
    balanced: { minTitles: 2, minFields: 8 },
    strongHeaders: { minTitles: 3, minFields: 5 },
    denseLabels: { minTitles: 1, minFields: 12 },
} as const;

function evaluateDocumentMatch(titleMatches: number, fieldMatches: number): {
    passed: boolean;
    rule: "balanced" | "strongHeaders" | "denseLabels" | null;
} {
    if (
        titleMatches >= ADAPTIVE_RULES.strongHeaders.minTitles &&
        fieldMatches >= ADAPTIVE_RULES.strongHeaders.minFields
    ) {
        return { passed: true, rule: "strongHeaders" };
    }

    if (
        titleMatches >= ADAPTIVE_RULES.balanced.minTitles &&
        fieldMatches >= ADAPTIVE_RULES.balanced.minFields
    ) {
        return { passed: true, rule: "balanced" };
    }

    if (
        titleMatches >= ADAPTIVE_RULES.denseLabels.minTitles &&
        fieldMatches >= ADAPTIVE_RULES.denseLabels.minFields
    ) {
        return { passed: true, rule: "denseLabels" };
    }

    return { passed: false, rule: null };
}

const DOCUMENT_GUARD_PROMPT = `You are a strict document-type validator.

Check whether this image is a page from the expected CUSTOMER APPLICATION FORM document set.

Known page tells (these are anchor signals, not an exhaustive list of everything on the page):
- Title: CUSTOMER APPLICATION FORM
- Section header: PERSONAL INFORMATION
- Section header: NEXT OF KIN (NOK) INFORMATION
- Numbered field layout with labels 1-22 that include these labels:
${EXPECTED_FIELDS.map((field, i) => `${i + 1}. ${field}`).join("\n")}

Acceptance threshold for expected application-form page (adaptive):
- Rule A (balanced): matchedTitles >= ${ADAPTIVE_RULES.balanced.minTitles} and matchedFields >= ${ADAPTIVE_RULES.balanced.minFields}
- Rule B (strong headers): matchedTitles >= ${ADAPTIVE_RULES.strongHeaders.minTitles} and matchedFields >= ${ADAPTIVE_RULES.strongHeaders.minFields}
- Rule C (dense labels): matchedTitles >= ${ADAPTIVE_RULES.denseLabels.minTitles} and matchedFields >= ${ADAPTIVE_RULES.denseLabels.minFields}

Return ONLY valid JSON in this exact format:
{
    "isExpectedDocument": true,
    "reason": "short reason",
    "matchedTitles": ["..."],
    "matchedFields": ["..."]
}

Decision rules:
- Use visual evidence from printed labels and headings (ignore handwritten values for classification).
- isExpectedDocument=true when ANY acceptance rule above is met and the page appears to belong to this form family.
- isExpectedDocument=false when key headings are missing, matched labels are sparse, or the layout is clearly a different form.
- Be conservative: if uncertain, return false.`;

const OCR_PROMPT = `You are an OCR assistant specialised in hand-filled CUSTOMER APPLICATION FORM pages.

Analyse the form image and respond ONLY with a valid JSON object in this exact format - no explanation outside the JSON:
{
  "text": "<full verbatim text from the form, preserving newlines>",
  "fields": [
    { "name": "<field label>", "value": "<field value>" }
  ]
}

Rules:
- "text" must contain every word visible in the image, in reading order.
- "fields" must return these labels (exact names) when present on the page:
${EXPECTED_FIELDS.map((field) => `  - ${field}`).join("\n")}
- "fields" must also include any additional printed label/value pairs on the page, even if not in the list above.
- If a field has no visible value, use an empty string for "value".
- If a character is hard to decipher in one place, cross-check repeated occurrences elsewhere in the same document to resolve it.
- Return a value for every identified field.
- The forms are primarily for Nigerians, so names, street names, and places are likely Nigerian; use this context to disambiguate uncertain handwriting when needed.`;

let cachedClient: OpenAI | null = null;

function getOpenAiClient(): OpenAI {
    if (cachedClient) {
        return cachedClient;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new OcrServiceError(500, "Missing OPENAI_API_KEY environment variable.");
    }

    cachedClient = new OpenAI({ apiKey });
    return cachedClient;
}

function extractOpenAiJson(content: string): {
    text?: string;
    fields?: { name: string; value: string }[];
} {
    const jsonStr = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(jsonStr) as {
        text?: string;
        fields?: { name: string; value: string }[];
    };
}

function extractGuardJson(content: string): {
    isExpectedDocument?: boolean;
    reason?: string;
    matchedTitles?: string[];
    matchedFields?: string[];
} {
    const jsonStr = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(jsonStr) as {
        isExpectedDocument?: boolean;
        reason?: string;
        matchedTitles?: string[];
        matchedFields?: string[];
    };
}

export async function processWithOpenAi(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const client = getOpenAiClient();

    const guardCompletion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: DOCUMENT_GUARD_PROMPT },
                    { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
                ],
            },
        ],
        max_tokens: 450,
    });

    const guardContent = guardCompletion.choices[0]?.message?.content ?? "";

    let isExpectedDocument = false;
    let guardReason = "Could not verify document type.";

    try {
        const guardData = extractGuardJson(guardContent);
        const titleMatches = guardData.matchedTitles?.length ?? 0;
        const fieldMatches = guardData.matchedFields?.length ?? 0;
        const adaptiveMatch = evaluateDocumentMatch(titleMatches, fieldMatches);

        isExpectedDocument = guardData.isExpectedDocument === true && adaptiveMatch.passed;

        if (guardData.reason?.trim()) {
            guardReason = guardData.reason.trim();
        }

        if (!adaptiveMatch.passed) {
            guardReason = `Matched ${titleMatches} titles and ${fieldMatches} known fields. Expected one adaptive match rule: balanced (${ADAPTIVE_RULES.balanced.minTitles}/${ADAPTIVE_RULES.balanced.minFields}), strong headers (${ADAPTIVE_RULES.strongHeaders.minTitles}/${ADAPTIVE_RULES.strongHeaders.minFields}), or dense labels (${ADAPTIVE_RULES.denseLabels.minTitles}/${ADAPTIVE_RULES.denseLabels.minFields}).`;
        } else if (guardReason === "Could not verify document type.") {
            guardReason = `Matched adaptive rule: ${adaptiveMatch.rule}.`;
        }
    } catch {
        throw new OcrServiceError(
            400,
            "Unsupported document type: failed to validate document template.",
        );
    }

    if (!isExpectedDocument) {
        throw new OcrServiceError(
            400,
            `Unsupported document type. Expected a page from the standard CUSTOMER APPLICATION FORM set. ${guardReason}`,
        );
    }

    const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: OCR_PROMPT },
                    { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
                ],
            },
        ],
        max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content ?? "";

    let rawText = "";
    let extractedFields: { name: string; value: string }[] = [];

    try {
        const data = extractOpenAiJson(content);
        rawText = data.text?.trim() ?? "";
        extractedFields = data.fields ?? [];
    } catch {
        rawText = content.trim();
    }

    const formFields = extractedFields.map((field) => ({
        name: field.name,
        value: field.value,
        confidence: null,
    }));

    const parsed = parseOcrText(rawText, formFields);

    return buildOcrResponse(file, rawText, parsed);
}
