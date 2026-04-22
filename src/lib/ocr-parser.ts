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

export type DocumentAiTextAnchor = {
  textSegments?: {
    startIndex?: string | number | { toNumber: () => number } | null;
    endIndex?: string | number | { toNumber: () => number } | null;
  }[] | null;
};

export type DocumentAiFormField = {
  fieldName?: {
    textAnchor?: DocumentAiTextAnchor | null;
  } | null;
  fieldValue?: {
    textAnchor?: DocumentAiTextAnchor | null;
  } | null;
  confidence?: number | null;
};

function textFromAnchor(rawText: string, anchor?: DocumentAiTextAnchor | null): string {
  const segments = anchor?.textSegments;

  if (!segments || segments.length === 0) {
    return "";
  }

  return segments
    .map((segment) => {
      const startValue = segment.startIndex;
      const endValue = segment.endIndex;
      const start = Number(
        typeof startValue === "object" && startValue !== null && "toNumber" in startValue
          ? startValue.toNumber()
          : startValue ?? 0,
      );
      const end = Number(
        typeof endValue === "object" && endValue !== null && "toNumber" in endValue
          ? endValue.toNumber()
          : endValue ?? 0,
      );

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return "";
      }

      return rawText.slice(start, end);
    })
    .join("")
    .trim();
}

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function parseDocumentAiFormFields(
  rawText: string,
  fields: DocumentAiFormField[],
): OcrParseResult["formFields"] {
  return fields
    .map((field) => {
      const name = textFromAnchor(rawText, field.fieldName?.textAnchor);
      const value = textFromAnchor(rawText, field.fieldValue?.textAnchor);

      return {
        name,
        value,
        confidence: typeof field.confidence === "number" ? field.confidence : null,
      };
    })
    .filter((entry) => entry.name.length > 0 || entry.value.length > 0);
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