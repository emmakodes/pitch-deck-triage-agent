import { createAction } from 'nango';
import * as z from 'zod';

/**
 * Fetch the raw content of one Gmail attachment.
 *
 * Split from list-pitch-emails on purpose: Gmail's message-list and
 * message-get calls return attachment *metadata* (filename, mimeType, an
 * attachmentId) but never the bytes. Getting the actual Pitch Deck content is
 * always this second, separate call - see CONTEXT.md: Pitch Deck.
 */

const inputSchema = z.object({
    messageId: z.string().min(1),
    attachmentId: z.string().min(1)
});

const outputSchema = z.object({
    // Gmail returns this base64url-encoded (RFC 4648 §5: '-'/'_', no padding)
    // - not standard base64. The caller has to convert before decoding.
    data: z.string(),
    size: z.number()
});

interface GmailAttachmentResponse {
    data: string;
    size: number;
}

const action = createAction({
    description: "Fetch the raw content of one Gmail attachment (base64url-encoded, as Gmail's API returns it).",
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/gmail/attachment', group: 'Triage' },
    input: inputSchema,
    output: outputSchema,

    exec: async (nango, input): Promise<z.infer<typeof outputSchema>> => {
        const res = await nango.get<GmailAttachmentResponse>({
            endpoint: `/gmail/v1/users/me/messages/${input.messageId}/attachments/${input.attachmentId}`
        });

        return { data: res.data.data, size: res.data.size };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
