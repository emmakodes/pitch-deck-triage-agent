/**
 * Generates the fabricated sample Pitch Decks this build runs against (see
 * CONTEXT.md). All companies, people, and numbers below are made up.
 *
 *   npm run generate-decks
 */
import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', '..', 'decks');

interface Deck {
    filename: string;
    lines: string[];
}

// Built to exercise the Thesis in ./thesis.ts: one clean fit, two clean
// misses for two different exclusion reasons (consumer, hardware).
const DECKS: Deck[] = [
    {
        filename: 'quantumleap-fit.pdf',
        lines: [
            'QuantumLeap Analytics',
            'Observability for backend engineers, not SREs on-call at 3am.',
            '',
            'Problem: mid-size engineering teams drown in dashboards but still get paged for issues nobody can explain.',
            'Solution: a query-log-first observability tool built directly into the deploy pipeline, no agent to babysit.',
            '',
            'Team: two co-founders, both ex-Datadog engineers, both still write the core query engine.',
            'Traction: $380K ARR across 14 mid-market engineering teams, up from $90K six months ago.',
            'Ask: raising a $2.5M seed to hire 2 engineers and close a pipeline of 6 enterprise pilots we believe gets us to $1.1M ARR within 12 months.',
            'Incorporated: Delaware C-corp, HQ in Austin, TX.'
        ]
    },
    {
        filename: 'fieldnote-no-fit-consumer.pdf',
        lines: [
            'Fieldnote',
            'A daily journaling app that turns your mood into a photo memory.',
            '',
            'Problem: people want to reflect on their day but journaling apps feel like homework.',
            'Solution: a 10-second voice note becomes a journal entry with an AI-generated photo of your mood.',
            '',
            'Team: one founder, background in product design at a consumer social app.',
            'Traction: 40,000 downloads, 3,200 weekly active users, freemium with a $4.99/mo tier.',
            'Ask: raising a $1.5M pre-seed to grow to 250,000 downloads via TikTok creator partnerships.',
            'Incorporated: Delaware C-corp, HQ in Los Angeles, CA.'
        ]
    },
    {
        filename: 'brightforge-no-fit-hardware.pdf',
        lines: [
            'BrightForge Robotics',
            'Autonomous forklifts for mid-size warehouses.',
            '',
            "Problem: mid-size warehouses can't justify a full automation retrofit, so they stay manual and understaffed.",
            'Solution: a retrofit kit that turns an existing forklift into an autonomous unit in under a day.',
            '',
            'Team: two mechanical engineers, one ex-Boston Dynamics, one ex-Zoox.',
            'Traction: 3 warehouse pilots running, $210K in signed pilot revenue, hardware gross margin 38%.',
            'Ask: raising a $4M seed to build the next hardware revision and open a small assembly line.',
            'Incorporated: Delaware C-corp, HQ in Pittsburgh, PA.'
        ]
    }
];

mkdirSync(OUT_DIR, { recursive: true });

async function writeDeck(deck: Deck): Promise<void> {
    const outPath = join(OUT_DIR, deck.filename);
    const doc = new PDFDocument({ margin: 60 });
    const stream = createWriteStream(outPath);
    doc.pipe(stream);

    const [title, ...rest] = deck.lines;
    doc.fontSize(20).text(title ?? '', { underline: true });
    doc.moveDown();
    doc.fontSize(12);
    for (const line of rest) {
        if (line === '') {
            doc.moveDown();
        } else {
            doc.text(line);
        }
    }
    doc.end();

    // pdfkit writes the trailer/xref asynchronously - wait for the stream to
    // actually finish, or the file is truncated (pdf-parse then fails with
    // "bad XRef entry" on an otherwise-fine-looking file).
    await new Promise<void>((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });
    console.log(`Wrote ${outPath}`);
}

for (const deck of DECKS) {
    await writeDeck(deck);
}
