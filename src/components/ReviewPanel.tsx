"use client";

import { ArrowLeft, Check, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { type ApiResponse } from "@/components/ResultsPanel";

const LOW_CONFIDENCE_THRESHOLD = 0.9;

export function ReviewPanel({
    result,
    fileUrl,
    mimeType,
    onBack,
}: {
    result: ApiResponse;
    fileUrl: string;
    mimeType: string;
    onBack: () => void;
}) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [rawOpen, setRawOpen] = useState(false);

    async function handleCopy(key: string, text: string) {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 1400);
    }

    // Prefer structured form fields; fall back to key-value pairs
    const fields =
        result.parsed.formFields.length > 0
            ? result.parsed.formFields
            : Object.entries(result.parsed.keyValues).map(([name, value]) => ({
                name,
                value,
                confidence: null,
            }));

    const [editedFields, setEditedFields] = useState(fields);

    useEffect(() => {
        setEditedFields(fields);
    }, [result]);

    const reviewSummary = useMemo(() => {
        const lowConfidenceCount = editedFields.filter(
            (field) =>
                field.confidence !== null && field.confidence < LOW_CONFIDENCE_THRESHOLD,
        ).length;

        return { lowConfidenceCount };
    }, [editedFields]);

    function updateFieldValue(index: number, value: string) {
        setEditedFields((current) =>
            current.map((field, fieldIndex) =>
                fieldIndex === index ? { ...field, value } : field,
            ),
        );
    }

    return (
        <div className="flex flex-1 flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--surface-strong)]"
                >
                    <ArrowLeft size={15} />
                    New document
                </button>
                <span className="text-sm font-medium">{result.fileName}</span>
                <span className="rounded-full bg-[var(--surface-strong)] px-2.5 py-0.5 font-mono text-xs text-[var(--muted)]">
                    {result.meta.formFieldCount} field{result.meta.formFieldCount !== 1 ? "s" : ""}
                </span>
                {reviewSummary.lowConfidenceCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-xs text-amber-800">
                        {reviewSummary.lowConfidenceCount} need review
                    </span>
                )}
            </div>

            {/* Split panel */}
            <div className="grid flex-1 min-h-0 grid-cols-2">
                {/* Left: document preview */}
                <div className="overflow-y-auto border-r border-[var(--border)] bg-[var(--surface-strong)] p-6">
                    {mimeType.startsWith("image/") ? (
                        <img
                            src={fileUrl}
                            alt="Document preview"
                            className="mx-auto w-full rounded-2xl shadow-sm"
                        />
                    ) : (
                        <iframe
                            src={fileUrl}
                            title="Document preview"
                            className="min-h-[80vh] w-full rounded-2xl border border-[var(--border)]"
                        />
                    )}
                </div>

                {/* Right: extracted fields */}
                <div className="overflow-y-auto p-6">
                    <h2 className="mb-5 text-lg font-semibold">Verify extracted fields</h2>

                    {fields.length === 0 ? (
                        <p className="text-sm text-[var(--muted)]">No fields detected.</p>
                    ) : (
                        <ul className="space-y-3">
                            {editedFields.map((field, i) => (
                                <li
                                    key={`${field.name}-${i}`}
                                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">
                                                {field.name || "(Unnamed field)"}
                                            </p>
                                            {field.confidence !== null && (
                                                <p
                                                    className={[
                                                        "mt-1 text-xs font-medium",
                                                        field.confidence < LOW_CONFIDENCE_THRESHOLD
                                                            ? "text-amber-700"
                                                            : "text-[var(--muted)]",
                                                    ].join(" ")}
                                                >
                                                    {field.confidence < LOW_CONFIDENCE_THRESHOLD
                                                        ? `Low confidence: ${Math.round(field.confidence * 100)}%`
                                                        : `Confidence: ${Math.round(field.confidence * 100)}%`}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopy(`field-${i}`, field.value || "")
                                            }
                                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)] transition hover:text-[var(--foreground)]"
                                        >
                                            {copiedKey === `field-${i}` ? (
                                                <Check size={11} />
                                            ) : (
                                                <Copy size={11} />
                                            )}
                                            {copiedKey === `field-${i}` ? "Copied" : "Copy"}
                                        </button>
                                    </div>
                                    <textarea
                                        value={field.value}
                                        onChange={(event) => updateFieldValue(i, event.target.value)}
                                        rows={Math.max(2, Math.min(4, field.value.split(/\r?\n/).length || 1))}
                                        placeholder="empty"
                                        className={[
                                            "mt-2 w-full rounded-lg border px-3 py-2 text-base leading-snug outline-none transition",
                                            field.confidence !== null && field.confidence < LOW_CONFIDENCE_THRESHOLD
                                                ? "border-amber-300 bg-amber-50/60 focus:border-amber-500"
                                                : "border-[var(--border)] bg-white focus:border-[var(--accent)]",
                                        ].join(" ")}
                                    />

                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Raw OCR text — collapsible */}
                    <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <button
                            type="button"
                            onClick={() => setRawOpen((o) => !o)}
                            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
                        >
                            Raw OCR text
                            {rawOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                        {rawOpen && (
                            <pre className="border-t border-[var(--border)] p-4 font-mono text-xs leading-relaxed text-[var(--muted)] whitespace-pre-wrap break-words">
                                {result.rawText || "No text detected."}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
