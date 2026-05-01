import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

export type ApiResponse = {
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

function CopyButton({
    copyKey,
    value,
    copiedKey,
    onCopy,
}: {
    copyKey: string;
    value: string;
    copiedKey: string | null;
    onCopy: (key: string, text: string) => Promise<void>;
}) {
    const isCopied = copiedKey === copyKey;

    return (
        <button
            type="button"
            onClick={() => onCopy(copyKey, value)}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
            aria-label="Copy value"
        >
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
            {isCopied ? "Copied" : "Copy"}
        </button>
    );
}

export function ResultsPanel({ result }: { result: ApiResponse }) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const hasEntities = useMemo(() => {
        const { entities } = result.parsed;
        return Object.values(entities).some((items) => items.length > 0);
    }, [result]);

    async function handleCopy(key: string, text: string) {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => {
            setCopiedKey((current) => (current === key ? null : current));
        }, 1400);
    }

    return (
        <section className="grid gap-6 md:grid-cols-2">
            <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_24px_rgba(17,34,26,0.06)]">
                <h2 className="text-xl font-semibold">Summary</h2>
                <p className="mt-4 text-sm text-[var(--muted)]">File: {result.fileName}</p>
                <p className="text-sm text-[var(--muted)]">Type: {result.mimeType}</p>
                <p className="text-sm text-[var(--muted)]">
                    Characters: {result.meta.charCount} | Lines: {result.meta.lineCount} | Form
                    fields: {result.meta.formFieldCount}
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
                                <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium">{field.name || "(Unnamed field)"}</p>
                                    <CopyButton
                                        copyKey={`form-${index}`}
                                        value={field.value || ""}
                                        copiedKey={copiedKey}
                                        onCopy={handleCopy}
                                    />
                                </div>
                                <p>{field.value || "-"}</p>
                                {field.confidence !== null && (
                                    <p className="font-mono text-xs text-[var(--muted)]">
                                        Confidence: {Math.round(field.confidence * 100)}%
                                    </p>
                                )}
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
                            <li
                                key={key}
                                className="rounded-lg bg-[var(--surface-strong)] px-3 py-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
                                        {key}
                                    </span>
                                    <CopyButton
                                        copyKey={`kv-${key}`}
                                        value={value}
                                        copiedKey={copiedKey}
                                        onCopy={handleCopy}
                                    />
                                </div>
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
                        <div
                            key={label}
                            className="rounded-lg bg-[var(--surface-strong)] px-3 py-2"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-mono text-xs uppercase tracking-wider text-[var(--muted)]">
                                    {label}
                                </p>
                                <CopyButton
                                    copyKey={`entity-${label}`}
                                    value={values.join(", ")}
                                    copiedKey={copiedKey}
                                    onCopy={handleCopy}
                                />
                            </div>
                            <p className="mt-1 break-all">{values.join(", ") || "-"}</p>
                        </div>
                    ))}
                </div>
            </article>

            <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_12px_24px_rgba(17,34,26,0.06)]">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">Raw OCR Text</h2>
                    <CopyButton
                        copyKey="raw-text"
                        value={result.rawText || ""}
                        copiedKey={copiedKey}
                        onCopy={handleCopy}
                    />
                </div>
                <pre className="mt-4 max-h-[500px] overflow-auto rounded-xl bg-[#0f1a14] p-4 font-mono text-xs leading-relaxed text-[#d4f3de]">
                    {result.rawText || "No text detected."}
                </pre>
            </article>
        </section>
    );
}
