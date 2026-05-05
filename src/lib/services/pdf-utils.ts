import path from "node:path";

import { createCanvas } from "@napi-rs/canvas";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = path.resolve(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
);

/**
 * Renders each page of a PDF to a base64-encoded PNG data URL.
 * Scale 3.5 gives ~252 DPI which is recommended for handwriting OCR.
 */
export async function pdfToImageDataUrls(arrayBuffer: ArrayBuffer): Promise<string[]> {
    const loadingTask = getDocument({
        data: new Uint8Array(arrayBuffer),
        useWorkerFetch: false,
        useSystemFonts: true,
    } as never);

    const pdf = await loadingTask.promise;
    const images = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, index) => {
            const page = await pdf.getPage(index + 1);
            const viewport = page.getViewport({ scale: 3.5 });

            const canvas = createCanvas(viewport.width, viewport.height);
            const context = canvas.getContext("2d");

            await page.render({
                canvas: canvas as never,
                canvasContext: context as unknown as CanvasRenderingContext2D,
                viewport,
            }).promise;

            const image = canvas.toDataURL("image/png");
            page.cleanup();
            return image;
        }),
    );

    await pdf.destroy();

    return images;
}
