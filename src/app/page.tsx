"use client";

import { useMemo, useState } from "react";

type ApiResponse = {
  fileName: string;
  mimeType: string;
  rawText: string;
  parsed: {
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
  meta: {
    charCount: number;
    lineCount: number;
    formFieldCount: number;
  };
  error?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const hasEntities = useMemo(() => {
    if (!result) {
      return false;
    }

    const { entities } = result.parsed;
    return Object.values(entities).some((items) => items.length > 0);
  }, [result]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose an image file first.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to parse OCR.");
      }

      setResult(payload);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while processing the image.";
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_16px_40px_rgba(17,34,26,0.08)] md:p-10">
        <p className="text-sm font-mono uppercase tracking-[0.2em] text-[var(--muted)]">
          Google Document AI
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
          Hand-filled form parser with structured extraction
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[var(--muted)] md:text-lg">
          Upload a scanned form image or PDF. The app uses Google Document AI to
          extract handwritten and printed text, detect form fields, and return
          normalized key-value output.
        </p>

        <form className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
          <label className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-medium text-[var(--foreground)]">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="w-full cursor-pointer text-sm"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Parsing..." : "Parse Form"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_24px_rgba(17,34,26,0.06)]">
            <h2 className="text-xl font-semibold">Summary</h2>
            <p className="mt-4 text-sm text-[var(--muted)]">File: {result.fileName}</p>
            <p className="text-sm text-[var(--muted)]">Type: {result.mimeType}</p>
            <p className="text-sm text-[var(--muted)]">
              Characters: {result.meta.charCount} | Lines: {result.meta.lineCount} |
              Form fields: {result.meta.formFieldCount}
            </p>

            <h3 className="mt-6 text-base font-semibold">Detected Form Fields</h3>
            {result.parsed.formFields.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">No form fields detected.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {result.parsed.formFields.map((field, index) => (
                  <li
                    key={`${field.name}-${index}`}
                    className="rounded-lg bg-[var(--surface-strong)] px-3 py-2"
                  >
                    <p className="font-medium">{field.name || "(Unnamed field)"}</p>
                    <p>{field.value || "-"}</p>
                    <p className="font-mono text-xs text-[var(--muted)]">
                      Confidence: {field.confidence ? `${Math.round(field.confidence * 100)}%` : "-"}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-6 text-base font-semibold">Key-Value Fields</h3>
            {Object.keys(result.parsed.keyValues).length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">No obvious fields found.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {Object.entries(result.parsed.keyValues).map(([key, value]) => (
                  <li key={key} className="rounded-lg bg-[var(--surface-strong)] px-3 py-2">
                    <span className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
                      {key}
                    </span>
                    <p className="font-medium">{value}</p>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-6 text-base font-semibold">Detected Entities</h3>
            {!hasEntities && (
              <p className="mt-2 text-sm text-[var(--muted)]">No entities detected.</p>
            )}
            <div className="mt-2 grid gap-3 text-sm">
              {Object.entries(result.parsed.entities).map(([label, values]) => (
                <div key={label} className="rounded-lg bg-[var(--surface-strong)] px-3 py-2">
                  <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
                    {label}
                  </p>
                  <p className="mt-1 break-all">{values.join(", ") || "-"}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_24px_rgba(17,34,26,0.06)]">
            <h2 className="text-xl font-semibold">Raw OCR Text</h2>
            <pre className="mt-4 max-h-[500px] overflow-auto rounded-xl bg-[#0f1a14] p-4 font-mono text-xs leading-relaxed text-[#d4f3de]">
              {result.rawText || "No text detected."}
            </pre>
          </article>
        </section>
      )}
    </main>
  );
}
