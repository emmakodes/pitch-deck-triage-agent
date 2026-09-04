# Pitch Deck Triage Agent

A small LangGraph pipeline that reads inbound pitch-deck emails from Gmail, judges each deck against a fixed investment Thesis, and notifies Slack when one fits — built on Nango for the Gmail and Slack connections.

## Language

**Thesis**:
The fixed, hardcoded description of what kind of company this system is looking for (stage, sector, geography, etc.). Configured once at build time, not fetched per run, and — for this build — fabricated rather than a real fund's actual thesis.
_Avoid_: Criteria, Filter, Mandate.

**Pitch Deck**:
The PDF attachment on an inbound email that this system evaluates against the Thesis. Text-only extraction, no OCR — an image-only deck isn't readable by this system. For this build, decks are fabricated sample PDFs, not real founder submissions.
_Avoid_: Attachment, File.

**Fit Assessment**:
The output of evaluating one Pitch Deck against the Thesis: a boolean fit/no-fit, a short reasoning, and an Evidence Quote. Produced by one LLM call using structured output.
_Avoid_: Score, Classification, Verdict.

**Evidence Quote**:
The verbatim excerpt from the Pitch Deck's extracted text that a Fit Assessment cites as the basis for its fit/no-fit call.
_Avoid_: Snippet, Highlight.

**Triage Run**:
One manual, on-demand execution of the full pipeline (fetch email → fetch+extract deck → Fit Assessment → notify) for a single email. Not a continuously running background process.
_Avoid_: Job, Sync — a Nango sync is a different, continuously-running mechanism and is not what triggers a Triage Run.

**Triage Graph**:
The LangGraph pipeline itself: a fixed sequence of nodes (fetch email → fetch+extract deck → Fit Assessment → conditional notify) where each node calls one specific, named Nango MCP tool. No node hands an LLM a set of tools and lets it choose — MCP here is transport, not delegated judgment.
_Avoid_: Agent — this system has no tool-picking agent, unlike the Linear sample it follows.

**Reprocessing Gap**:
The known, unsolved limitation that running a second Triage Run against the same email produces a second Slack notification for it. Explicitly out of scope for this build, not silently ignored.
_Avoid_: Idempotency, Dedupe — naming the mechanism that would fix it implies it's fixed; it isn't.

**Candidate Ordering Gap**:
The known, unsolved limitation that a Triage Run always acts on the first result Gmail's search returns, and that order is not reliably newest-first — confirmed live (§2, RESULTS.md): an older matching email outranked one sent after it. A genuinely new fit deck can sit unprocessed behind an older, already-handled one. Distinct from the Reprocessing Gap: that one is about running the same email twice; this one is about never reaching the right email at all.
_Avoid_: conflating with the Reprocessing Gap — they're two separate unsolved gaps, not one.

