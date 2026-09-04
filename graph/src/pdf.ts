import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

interface TextItem {
    str?: string;
}

type GetDocumentParams = Parameters<typeof getDocument>[0];

/**
 * Extract raw text from a Gmail attachment's base64url-encoded PDF content.
 * Text-only, no OCR - an image-only deck (a slide export with no text layer)
 * comes back empty. See CONTEXT.md: Pitch Deck.
 *
 * Uses pdfjs-dist directly rather than the more common `pdf-parse` package:
 * `pdf-parse` bundles a pdf.js build from ~2019 that threw "bad XRef entry"
 * on a perfectly well-formed PDF written by a current pdfkit (0.15.x) - the
 * xref table checked out byte-for-byte by hand, so this is a pdf-parse
 * compatibility bug, not a malformed file.
 *
 * NB: this also logs a harmless `standardFontDataUrl` warning to stderr for
 * a non-embedded standard font (e.g. pdfkit's default Helvetica) - pdf.js
 * falls back to its own metrics and the extracted text is unaffected;
 * pointing it at the bundled `standard_fonts/` directory to silence it
 * raised a *second*, unrelated font-loading error, so it's left as a known
 * cosmetic rough edge rather than chased further.
 */
export async function extractPdfText(base64UrlData: string): Promise<string> {
    const base64 = base64UrlData.replace(/-/g, '+').replace(/_/g, '/');
    const buffer = Buffer.from(base64, 'base64');

    // `disableWorker` works at runtime (skips spawning/locating a worker
    // bundle, fine for one small PDF per Triage Run) but isn't in this
    // version's shipped types - assert rather than cast the whole call away.
    const params = {
        data: new Uint8Array(buffer),
        disableWorker: true
    } as unknown as GetDocumentParams;
    const doc = await getDocument(params).promise;
    const pages: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        const text = content.items.map((item) => (item as TextItem).str ?? '').join(' ');
        pages.push(text);
    }

    return pages.join('\n\n').trim();
}
