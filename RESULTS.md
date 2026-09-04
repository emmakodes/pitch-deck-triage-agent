# Results

Real output only - no invented numbers. Fill each section as you work through
`RUNBOOK.md`.

## Environment

- Nango dev environment, integrations: `google-mail`, `slack`
- Gmail connection ID: `555820d4-fe08-4be1-80a4-305b752b1be7`
- Slack connection ID: `47fe4e22-772d-4823-9d96-5a67784b5b85`
- `list-pitch-emails` dryrun before an email existed: `{ "candidates": [] }` -
  real `HTTP 200` against `GET https://api.nango.dev/proxy/gmail/v1/users/me/messages`

**Real, live bugs found before/during first run (both fixed, see git log):**

1. `nango deploy dev` operates on the whole environment, not just the local
   folder - deploying this project from a shared dev environment silently
   *deleted* the Linear sample's two actions (`Actions +3 -2` in the plan,
   proceeded without confirmation since no connections used them). Not a bug
   in our code, but a real platform behavior worth knowing before pointing
   two local Nango projects at one environment.
2. `list-pitch-emails`' input was `z.void()`, which Nango compiles to a
   `{"type":"null"}` validation schema. An MCP `tools/call` sends `arguments`
   as an object (`{}` for a no-input tool) - that failed `invalid_action_input`
   ("must be null") under strict validation. Fixed: `z.object({}).strict()`.
   Verified via `nango dryrun --input '{}' --validation` before and after.
3. `dotenv` silently drops everything after an unquoted `#` as a comment -
   `SLACK_CHANNEL=#project` in `.env` parsed to an empty string. Fixed by
   quoting: `SLACK_CHANNEL="#project"`.

## §1 First live Triage Run

The MCP client (`graph/src/mcp-client.ts`) worked against
`https://api.nango.dev/mcp` on the first real call - no wire-protocol
debugging needed, once the two bugs above were fixed. Full console output:

```
Warning: UnknownErrorException: Ensure that the `standardFontDataUrl` API parameter is provided.

--- Triage Run (20360 ms) ---
{
  "email": {
    "messageId": "1a06ec586e214db6",
    "threadId": "1a06ec4f9c310e09",
    "from": "Michael Michael <finemichaellz@gmail.com>",
    "subject": "pitch deck",
    "attachmentId": "ANGjdJ_Dfs7fEYm_TbDWmSqkJQtYvhCCwxuiXGXPTWABd9yh4I369dIs3AjJqXEiC2W14w7Kn9uNykWyb8JaLxGMRsxsFYRThZAKk9Riv83Ow3TJLWK4RrLAUjkP-UJs8wASobCv_DPdYcSH8_WtdKpR6H0VGo0jZylINwgHuaEmosLmFxSneOlcgE4ApkMI238dVRJTjmE1dYM8wOV6TRaIBB5w2tXD9oy1-qMViruWutK09D0iqnBw4vv93REoLy1klkKCmePYiukr9PVvauzYWpxE0HCMKj5oCUzl5oUYLspkAEqsASVzxAYiKLI",
    "filename": "quantumleap-fit.pdf"
  },
  "deckText": "QuantumLeap Analytics  Observability for backend engineers, not SREs on-call at 3am. Problem: mid-size engineering teams drown in dashboards but still get paged for issues nobody can explain. Solution: a query-log-first observability tool built directly into the deploy pipeline, no agent to babysit. Team: two co-founders, both ex-Datadog engineers, both still write the core query engine. Traction: $380K ARR across 14 mid-market engineering teams, up from $90K six months ago. Ask: raising a $2.5M seed to hire 2 engineers and close a pipeline of 6 enterprise pilots we believe gets us to $1.1M ARR within 12 months. Incorporated: Delaware C-corp, HQ in Austin, TX.",
  "assessment": {
    "fit": true,
    "reasoning": "The deck matches all thesis criteria: U.S. incorporation, developer-focused B2B software, current ARR in range, technical co-founders coding, and a clear path to $1M+ ARR in 12 months.",
    "evidenceQuote": "Team: two co-founders, both ex-Datadog engineers, both still write the core query engine. Traction: $380K ARR across 14 mid-market engineering teams, up from $90K six months ago. Ask: raising a $2.5M seed to hire 2 engineers and close a pipeline of 6 enterprise pilots we believe gets us to $1.1M ARR within 12 months. Incorporated: Delaware C-corp, HQ in Austin, TX."
  },
  "notified": true
}
```

Note: `evidenceQuote` here is a genuinely contiguous, verbatim span (good),
but it's 4 sentences - the whole back half of the deck - not the short
one-liner an earlier local smoke test produced for the same deck/schema.
Model variance run to run, not a bug; worth a length cap if a punchier quote
matters for the write-up.

`{{PLACEHOLDER: confirm the Slack message actually landed in #project - paste a screenshot or the message text}}`

## §2 All three decks

| Deck | Expected | `fit` | `reasoning` | `evidenceQuote` |
|---|---|---|---|---|
| `quantumleap-fit.pdf` | fit | | | |
| `fieldnote-no-fit-consumer.pdf` | no fit (consumer) | | | |
| `brightforge-no-fit-hardware.pdf` | no fit (hardware) | | | |

## §3 Reprocessing Gap

`{{PLACEHOLDER: what happened on the second `npm run triage` against the same email - duplicate Slack post, or no candidates found}}`

## §4 Verdict

`{{PLACEHOLDER: one-paragraph honest summary once the above is filled in}}`
