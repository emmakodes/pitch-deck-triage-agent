import { createAction } from 'nango';
import * as z from 'zod';

/**
 * Post a message to a Slack channel - the notify step of a Triage Run.
 *
 * Slack's `chat.postMessage`, like Linear's GraphQL endpoint in the sibling
 * project, answers HTTP 200 even when the post failed (`{ ok: false, error }`
 * in the body). Nango's proxy retry logic keys off the status code, so it
 * would never see this either - check `ok` explicitly.
 */

const inputSchema = z.object({
    channel: z.string().min(1).describe('Slack channel ID or name (e.g. "#pitch-triage")'),
    text: z.string().min(1)
});

const outputSchema = z.object({
    channel: z.string(),
    ts: z.string()
});

interface SlackPostMessageResponse {
    ok: boolean;
    error?: string;
    channel?: string;
    ts?: string;
}

const action = createAction({
    description: 'Post a message to a Slack channel.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/slack/messages', group: 'Triage' },
    input: inputSchema,
    output: outputSchema,

    exec: async (nango, input): Promise<z.infer<typeof outputSchema>> => {
        const res = await nango.post<SlackPostMessageResponse>({
            endpoint: '/chat.postMessage',
            retries: 0,
            data: { channel: input.channel, text: input.text }
        });

        if (!res.data.ok || !res.data.ts || !res.data.channel) {
            throw new nango.ActionError({ message: `Slack chat.postMessage failed: ${res.data.error ?? 'unknown error'}` });
        }

        return { channel: res.data.channel, ts: res.data.ts };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
