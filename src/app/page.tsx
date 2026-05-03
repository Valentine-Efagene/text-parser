"use client";

import { useState } from "react";

import { type ApiResponse } from "@/components/ResultsPanel";
import { ReviewPanel } from "@/components/ReviewPanel";
import { MOCK_RESPONSE } from "@/lib/mock-response";

type Step = "upload" | "parsing" | "review";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | undefined>();
  const [fileUrl, setFileUrl] = useState<string | undefined>();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<ApiResponse | undefined>();
  const [useMock, setUseMock] = useState(true);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  function selectFile(f: File) {
    if (f.size > MAX_FILE_SIZE) {
      setError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
      return;
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    setError(undefined);
    setResult(undefined);
  }

  function clearFile() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(undefined);
    setFileUrl(undefined);
  }

  function handleBack() {
    setStep("upload");
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }

  async function handleAnalyse() {
    if (!file) return;
    setStep("parsing");
    setError(undefined);

    try {
      let payload: ApiResponse;

      if (useMock) {
        // Simulate a short delay so the parsing step is visible
        await new Promise((r) => setTimeout(r, 800));
        payload = { ...MOCK_RESPONSE, fileName: file.name, mimeType: file.type };
      } else {
        const formData = new FormData();
        formData.append("file", file);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60_000);

        let response: Response;
        try {
          response = await fetch("/api/ocr-openai", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            throw new Error("Request timed out after 60 seconds. Please try again.");
          }
          throw err;
        } finally {
          clearTimeout(timeoutId);
        }

        payload = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to parse document.");
        }
      }

      setResult(payload);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("upload");
    }
  }

  // ── Parsing step ──────────────────────────────────────────────────────────
  if (step === "parsing") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
        <p className="text-sm font-medium text-[var(--muted)]">Analysing document…</p>
      </main>
    );
  }

  // ── Review step ───────────────────────────────────────────────────────────
  if (step === "review" && result && fileUrl && file) {
    return (
      <main className="flex flex-1 flex-col min-h-0">
        <ReviewPanel
          result={result}
          fileUrl={fileUrl}
          mimeType={file.type}
          onBack={handleBack}
        />
      </main>
    );
  }

  // ── Upload step ───────────────────────────────────────────────────────────
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Form Parser
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Extract form fields</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Upload a scanned document.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "relative flex w-full flex-col items-center gap-4 rounded-3xl border-2 border-dashed p-12 transition",
          isDragging
            ? "border-[var(--accent)] bg-[var(--surface-strong)]"
            : "border-[var(--border)] bg-[var(--surface)]",
        ].join(" ")}
      >
        {file ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--accent)]">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-[var(--muted)]">{(file.size / 1024).toFixed(0)} KB</p>
            <button
              type="button"
              onClick={clearFile}
              className="mt-1 text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--accent)]">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M12 4v11m-4-4 4-4 4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium">Drop your file here</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                or click to browse — image or PDF
              </p>
            </div>
          </>
        )}

        {/* Invisible full-area file input */}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) selectFile(f);
          }}
        />
      </div>

      {error && (
        <p className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Mock / Live toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={!useMock}
          onClick={() => setUseMock((m) => !m)}
          className={[
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
            useMock ? "bg-[var(--border)]" : "bg-[var(--accent)]",
          ].join(" ")}
        >
          <span
            className={[
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform",
              useMock ? "translate-x-0" : "translate-x-5",
            ].join(" ")}
          />
        </button>
        <span className="text-sm text-[var(--muted)]">
          {useMock ? (
            <>
              <span className="font-medium text-[var(--foreground)]">Mock mode</span>
              {" — no API call"}
            </>
          ) : (
            <>
              <span className="font-medium text-[var(--foreground)]">Live API</span>
              {" — calls OpenAI"}
            </>
          )}
        </span>
      </div>

      <button
        disabled={!file}
        onClick={handleAnalyse}
        className="rounded-2xl bg-[var(--accent)] px-10 py-3 font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Analyse Document
      </button>
    </main>
  );
}
