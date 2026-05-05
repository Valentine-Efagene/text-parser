import path from "node:path";

import { createCanvas } from "@napi-rs/canvas";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = path.resolve(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
);

/**
 * Renders each page of a PDF to a base64-encoded PNG data URL.
 * Scale 2.0 gives ~144 DPI which is sufficient for OCR.
 */
export async function pdfToImageDataUrls(arrayBuffer: ArrayBuffer): Promise<string[]> {
    const loadingTask = getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
        useSystemFonts: true,
    } as never);

    const pdf = await loadingTask.promise;
    const images: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");

        await page.render({
            canvas: canvas as never,
            canvasContext: context as unknown as CanvasRenderingContext2D,
            viewport,
        }).promise;

        images.push(canvas.toDataURL("image/png"));
        page.cleanup();
    }

    await pdf.destroy();

    return images;
}
