import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import type OpenAI from 'openai';
import { callNangoTool } from './mcp-client.ts';
import { extractPdfText } from './pdf.ts';
import { assessFit, type FitAssessment } from './assess.ts';
import { THESIS } from './thesis.ts';

interface EmailCandidate {
    messageId: string;
    threadId: string;
    from: string;
    subject: string;
    attachmentId: string;
    filename: string;
}

const TriageState = Annotation.Root({
    email: Annotation<EmailCandidate | null>({ reducer: (_prev, next) => next, default: () => null }),
    deckText: Annotation<string | null>({ reducer: (_prev, next) => next, default: () => null }),
    assessment: Annotation<FitAssessment | null>({ reducer: (_prev, next) => next, default: () => null }),
    notified: Annotation<boolean>({ reducer: (_prev, next) => next, default: () => false })
});

export interface GraphConfig {
    nangoSecretKey: string;
    gmailConnectionId: string;
    slackConnectionId: string;
    slackChannel: string;
    openai: OpenAI;
}

/**
 * The Triage Graph (see CONTEXT.md): a fixed sequence of nodes, each calling
 * one named Nango MCP tool directly. No node hands an LLM a toolset and lets
 * it choose - the only judgment call in here is inside `assess`, and it's a
 * structured-output classification, not a tool pick.
 */
export function buildTriageGraph(config: GraphConfig) {
    const gmailScope = { connectionId: config.gmailConnectionId, providerConfigKey: 'google-mail' };
    const slackScope = { connectionId: config.slackConnectionId, providerConfigKey: 'slack' };

    const graph = new StateGraph(TriageState)
        .addNode('fetchEmail', async () => {
            const { candidates } = await callNangoTool<{ candidates: EmailCandidate[] }>(config.nangoSecretKey, gmailScope, 'list-pitch-emails', {});
            const email = candidates[0] ?? null;
            if (!email) {
                console.log('No candidate Pitch Deck email found - nothing to triage this run.');
            }
            return { email };
        })
        .addNode('fetchDeck', async (state) => {
            if (!state.email) {
                return {};
            }
            const { data } = await callNangoTool<{ data: string; size: number }>(config.nangoSecretKey, gmailScope, 'fetch-attachment', {
                messageId: state.email.messageId,
                attachmentId: state.email.attachmentId
            });
            const deckText = await extractPdfText(data);
            return { deckText };
        })
        .addNode('assess', async (state) => {
            if (!state.deckText) {
                return {};
            }
            const assessment = await assessFit(config.openai, THESIS, state.deckText);
            return { assessment };
        })
        .addNode('notify', async (state) => {
            if (!state.email || !state.assessment) {
                return {};
            }
            const text =
                `*Pitch deck fit* — ${state.email.subject} (from ${state.email.from})\n` +
                `Fit: ${state.assessment.fit ? '✅ yes' : '❌ no'}\n` +
                `Reasoning: ${state.assessment.reasoning}\n` +
                `> ${state.assessment.evidenceQuote}`;
            await callNangoTool(config.nangoSecretKey, slackScope, 'send-slack-message', { channel: config.slackChannel, text });
            return { notified: true };
        })
        .addEdge(START, 'fetchEmail')
        .addConditionalEdges('fetchEmail', (state) => (state.email ? 'fetchDeck' : END), { fetchDeck: 'fetchDeck', [END]: END })
        .addEdge('fetchDeck', 'assess')
        // The Reprocessing Gap lives here too: nothing checks whether this
        // email was already triaged, so a fit found twice notifies twice.
        // Known, not built - see CONTEXT.md.
        .addConditionalEdges('assess', (state) => (state.assessment?.fit ? 'notify' : END), { notify: 'notify', [END]: END })
        .addEdge('notify', END);

    return graph.compile();
}
