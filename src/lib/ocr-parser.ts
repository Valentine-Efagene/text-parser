export type OcrParseResult = {
    lines: string[];
    keyValues: Record<string, string>;
    formFields: {
        name: string;
        value: string;
        confidence: number | null;
    }[];
    entities: {
        emails: string[];
        phones: string[];
        urls: string[];
        dates: string[];
        amounts: string[];
    };
};

function uniqueMatches(source: string, regex: RegExp): string[] {
    return [...new Set(source.match(regex) ?? [])];
}

function normalizeFieldName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function parseOcrText(
    rawText: string,
    formFields: OcrParseResult["formFields"] = [],
): OcrParseResult {
    const lines = rawText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const keyValues: Record<string, string> = {};

    for (const line of lines) {
        const match = line.match(/^([A-Za-z][A-Za-z0-9\s\-_/]{1,40})\s*[:\-]\s*(.+)$/);
        if (match) {
            const key = match[1].trim().toLowerCase().replace(/\s+/g, "_");
            keyValues[key] = match[2].trim();
        }
    }

    for (const field of formFields) {
        if (!field.name || !field.value) {
            continue;
        }

        const normalized = normalizeFieldName(field.name);
        if (normalized) {
            keyValues[normalized] = field.value;
        }
    }

    return {
        lines,
        keyValues,
        formFields,
        entities: {
            emails: uniqueMatches(rawText, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi),
            phones: uniqueMatches(rawText, /\+?\d[\d\s().-]{7,}\d/g),
            urls: uniqueMatches(rawText, /\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+/gi),
            dates: uniqueMatches(
                rawText,
                /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/gi,
            ),
            amounts: uniqueMatches(rawText, /(?:\$|€|£)\s?\d+(?:[.,]\d{2})?|\b\d+(?:[.,]\d{2})\s?(?:USD|EUR|GBP)\b/gi),
        },
    };
}