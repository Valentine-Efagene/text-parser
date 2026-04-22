# Handwritten Form Parser (Next.js + Google Document AI)

This app uses Google Document AI to extract text and fields from hand-filled forms and then parses:

- detected form fields (name/value with confidence)
- normalized key-value fields (for lines like `Invoice No: 12345`)
- entities such as emails, phones, urls, dates, and amounts
- raw OCR text + line-level output

## Tech stack

- Next.js (App Router, latest)
- TypeScript
- Tailwind CSS
- pnpm
- `@google-cloud/documentai`

## 1) Prerequisites

1. Create or choose a Google Cloud project.
2. Enable the Document AI API.
3. Create a Document AI processor for forms (Form Parser is recommended).
4. Create a service account with Document AI access.
5. Download the JSON key.

## 2) Environment variables

Copy `.env.example` to `.env.local` and configure one of these:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/document-ai-service-account.json
GOOGLE_DOCUMENT_AI_PROJECT_ID=your-gcp-project-id
GOOGLE_DOCUMENT_AI_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_ID=your-processor-id
```

Or for serverless/platform secrets:

```bash
GOOGLE_DOCUMENT_AI_CREDENTIALS_BASE64=<base64-of-service-account-json>
```

## 3) Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000, upload an image or PDF, and click **Parse Form**.

## API endpoint

- `POST /api/ocr`
- Body: `multipart/form-data` with `file` (image or PDF)
- Response: JSON with `rawText`, `parsed`, and `meta`

## Notes

- The OCR route runs on the Node.js runtime (`runtime = "nodejs"`).
- If OCR fails, verify processor ID, location, credentials, and Document AI API enablement.
