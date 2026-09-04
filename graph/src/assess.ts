import type OpenAI from 'openai';

/** The Fit Assessment shape - see CONTEXT.md. */
export interface FitAssessment {
    fit: boolean;
    reasoning: string;
    evidenceQuote: string;
}

const SCHEMA = {
    type: 'object',
    properties: {
        fit: { type: 'boolean', description: 'True if the deck matches the thesis, false otherwise.' },
        reasoning: { type: 'string', description: 'One or two sentences explaining the fit/no-fit call.' },
        evidenceQuote: {
            type: 'string',
            description:
                "A single contiguous verbatim span copied from the deck's text (a sentence or clause, not several stitched together with '...') that the reasoning is grounded in."
        }
    },
    required: ['fit', 'reasoning', 'evidenceQuote'],
    additionalProperties: false
} as const;

/**
 * One structured-output call: judge a Pitch Deck's extracted text against
 * the Thesis. This is the only place in the pipeline an LLM makes a
 * decision - fetching and notifying are both fixed, MCP-tool-calling code
 * (see CONTEXT.md: Triage Graph).
 */
export async function assessFit(openai: OpenAI, thesis: string, deckText: string): Promise<FitAssessment> {
    const response = await openai.responses.create({
        model: 'gpt-4.1', // pin the current model at build time
        input: [
            {
                role: 'system',
                content:
                    "You triage pitch decks against a fixed investment thesis. Judge only what the deck's text actually says - don't assume anything it doesn't state. Ground your reasoning in one short, verbatim quote from the deck: a single contiguous span copied exactly as written, never several sentences stitched together with '...'."
            },
            {
                role: 'user',
                content: `Thesis:\n${thesis}\n\nPitch deck text:\n${deckText}`
            }
        ],
        text: {
            format: {
                type: 'json_schema',
                name: 'fit_assessment',
                schema: SCHEMA,
                strict: true
            }
        }
    });

    return JSON.parse(response.output_text) as FitAssessment;
}
