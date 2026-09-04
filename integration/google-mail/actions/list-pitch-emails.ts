import { createAction } from 'nango';
import * as z from 'zod';

/**
 * List recent Gmail messages that look like a pitch-deck submission: they
 * have a PDF attachment. One candidate Pitch Deck per matching message (see
 * CONTEXT.md).
 *
 * This is deliberately a *search*, not a read of Nango's pre-built `emails`
 * sync. A sync backfills and stores every message as a background job; there
 * is no on-demand "search now" over it. A Triage Run is on-demand by design
 * (see CONTEXT.md: Triage Run), so this action calls the Gmail API directly
 * for whatever matches right now.
 *
 * Only returns metadata + an attachmentId - Gmail's API does not return
 * attachment content in the same call. Fetching the bytes is a second action:
 * fetch-attachment.
 *
 * Input is `z.object({}).strict()`, not `z.void()`: Nango compiles `void` to
 * a `{"type":"null"}` JSON schema, but an MCP `tools/call` sends `arguments`
 * as an object - `{}` for a tool with nothing to pass - which fails that
 * schema (`must be null`) under strict validation. Verified live via
 * `nango dryrun --input '{}' --validation`.
 */

const QUERY = 'has:attachment filename:pdf newer_than:30d';
const MAX_RESULTS = 5;

const outputSchema = z.object({
    candidates: z.array(
        z.object({
            messageId: z.string(),
            threadId: z.string(),
            from: z.string(),
            subject: z.string(),
            attachmentId: z.string(),
            filename: z.string()
        })
    )
});

interface GmailHeader {
    name: string;
    value: string;
}

interface GmailPart {
    mimeType?: string;
    filename?: string;
    body?: { attachmentId?: string; size?: number };
    parts?: GmailPart[];
}

interface GmailMessage {
    id: string;
    threadId: string;
    payload?: GmailPart & { headers?: GmailHeader[] };
}

interface GmailListResponse {
    messages?: { id: string; threadId: string }[];
}

function findPdfAttachment(part: GmailPart | undefined): { attachmentId: string; filename: string } | undefined {
    if (!part) {
        return undefined;
    }
    if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
        return { attachmentId: part.body.attachmentId, filename: part.filename || 'deck.pdf' };
    }
    for (const child of part.parts ?? []) {
        const found = findPdfAttachment(child);
        if (found) {
            return found;
        }
    }
    return undefined;
}

function header(headers: GmailHeader[] | undefined, name: string): string {
    return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

const action = createAction({
    description: 'List recent Gmail messages that have a PDF attachment, one candidate Pitch Deck per message.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/gmail/pitch-emails', group: 'Triage' },
    input: z.object({}).strict(),
    output: outputSchema,

    exec: async (nango): Promise<z.infer<typeof outputSchema>> => {
        const listRes = await nango.get<GmailListResponse>({
            endpoint: '/gmail/v1/users/me/messages',
            params: { q: QUERY, maxResults: String(MAX_RESULTS) }
        });

        const candidates: z.infer<typeof outputSchema>['candidates'] = [];
        for (const { id } of listRes.data.messages ?? []) {
            const msgRes = await nango.get<GmailMessage>({
                endpoint: `/gmail/v1/users/me/messages/${id}`,
                params: { format: 'full' }
            });

            const attachment = findPdfAttachment(msgRes.data.payload);
            if (!attachment) {
                // Gmail's `filename:pdf` search is loose - it can match a
                // message whose attachment isn't actually a PDF part. Not a
                // Pitch Deck, skip it.
                continue;
            }

            candidates.push({
                messageId: msgRes.data.id,
                threadId: msgRes.data.threadId,
                from: header(msgRes.data.payload?.headers, 'From'),
                subject: header(msgRes.data.payload?.headers, 'Subject'),
                attachmentId: attachment.attachmentId,
                filename: attachment.filename
            });
        }

        return { candidates };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
