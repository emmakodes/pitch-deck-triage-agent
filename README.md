# A pitch deck triage agent: LangGraph + Nango

A small, honest test of an agentic pipeline that touches three real services.
An inbound email with a PDF pitch deck gets pulled from Gmail, judged against
a fixed (fabricated) investment Thesis, and - if it fits - posted to Slack.
Built as a fixed [LangGraph](https://langchain-ai.github.io/langgraphjs/)
graph, with [Nango](https://nango.dev) providing the Gmail and Slack
connections and, deliberately, the transport for a hand-rolled MCP client
rather than an LLM-driven tool-picking agent.

The write-up: **[`post/draft.md`](post/draft.md)** (→ dev.to link once
published). The runs behind it: **[`RESULTS.md`](RESULTS.md)**.

This follows a sibling project, **[linear-agent-sample](https://github.com/emmakodes/linear-agent-sample)**,
which used an agent that picked its own tools via Nango's hosted MCP server.
This one deliberately does the opposite - see `graph/src/pipeline.ts` and
`CONTEXT.md`: **Triage Graph**.

## Layout

| Path | What |
|---|---|
| `CONTEXT.md` | Glossary - Thesis, Pitch Deck, Fit Assessment, Triage Run, Triage Graph, Reprocessing Gap. |
| `integration/google-mail/actions/list-pitch-emails.ts` | Search Gmail for messages with a PDF attachment. |
| `integration/google-mail/actions/fetch-attachment.ts` | Fetch one attachment's raw content (a separate call from the search - Gmail never returns both at once). |
| `integration/slack/actions/send-slack-message.ts` | Post the notification. |
| `graph/src/mcp-client.ts` | Hand-rolled MCP "Streamable HTTP" client - each node calls one named Nango tool directly, no LLM tool choice. |
| `graph/src/pdf.ts` | PDF text extraction (`pdfjs-dist` - see the comment for why not `pdf-parse`). |
| `graph/src/assess.ts` | The one LLM step: OpenAI structured output → `{ fit, reasoning, evidenceQuote }`. |
| `graph/src/pipeline.ts` | The LangGraph graph itself. |
| `graph/src/generate-decks.ts` | Generates the three fabricated sample decks in `decks/`. |
| `RUNBOOK.md` | Full setup steps. |

## Reproduce

Prereqs: a Gmail account, a Slack workspace, a free Nango account, an OpenAI
key. Full steps in [`RUNBOOK.md`](RUNBOOK.md). Short form:

```bash
cd integration
cp .env.example .env          # NANGO_SECRET_KEY_DEV
npm install
# Nango dashboard: add the Gmail + Slack integrations (the "Nango developer
# app" tab pre-fills everything), then create one connection for each.
npx nango deploy dev

cd ../graph
cp .env.example .env          # OPENAI_API_KEY, NANGO_SECRET_KEY,
                              # NANGO_GMAIL_CONNECTION_ID,
                              # NANGO_SLACK_CONNECTION_ID, SLACK_CHANNEL
npm install
npm run generate-decks        # writes fabricated sample decks to ../decks/
# email yourself one of the decks, then:
npm run triage
```

## Verify before trusting

- The `mcp-client.ts` JSON-RPC handshake against `https://api.nango.dev/mcp`
  - built from the MCP "Streamable HTTP" spec, never exercised live before
  the first real run in `RUNBOOK.md` §4.
- Gmail's search query syntax and the exact shape of a `messages.get`
  response (`payload.parts`, `attachmentId`) against Gmail's current API docs.
- Slack's `chat.postMessage` response shape and required scopes (`chat:write`).
- The OpenAI Responses API structured-output shape (`text.format`,
  `type: 'json_schema'`) against `openai@4.104.0`'s current types.
- Let `nango compile` pin Zod - don't hand-pin it.
