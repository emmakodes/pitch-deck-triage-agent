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

All three verified against real, live-fetched Gmail attachment content (not
local test files) - `quantumleap` and `fieldnote` via full `npm run triage`
runs, `brightforge` via direct `fetch-attachment` + the same extract/assess
code, after a Gmail search-ordering quirk (§ note below) meant the graph's
"take candidates[0]" picked `fieldnote` twice before `brightforge` ever
became reachable that way.

| Deck | Expected | `fit` | `reasoning` | `evidenceQuote` |
|---|---|---|---|---|
| `quantumleap-fit.pdf` | fit | `true` | "The deck matches all thesis criteria: U.S. incorporation, developer-focused B2B software, current ARR in range, technical co-founders coding, and a clear path to $1M+ ARR in 12 months." | (4-sentence contiguous span, see §1) |
| `fieldnote-no-fit-consumer.pdf` | no fit (consumer) | `false` | "The product is a consumer app for journaling, not B2B software aimed at technical buyers." | "Fieldnote  A daily journaling app that turns your mood into a photo memory." |
| `brightforge-no-fit-hardware.pdf` | no fit (hardware) | `false` | "The company is hardware-focused and not building B2B software for technical buyers such as developers or IT teams." | "a retrofit kit that turns an existing forklift into an autonomous unit in under a day." |

**Real finding**: Gmail's `messages.list` search order is not reliably
newest-first. After sending `fieldnote` then `brightforge`, a fresh search
still ranked `fieldnote` ahead of `brightforge` - so the graph's "handle
`candidates[0]`" reprocessed `fieldnote` a second time (a no-op here since
it's a no-fit, but the same mechanism would silently skip a genuinely new
fit deck if an older matching email happens to rank first). Worth a real
fix (sort/filter on internal date, or process every candidate) before this
goes anywhere near production - noted, not built, same spirit as the
Reprocessing Gap.

## §3 Reprocessing Gap

Confirmed live: re-ran `npm run triage` immediately after §1's successful run,
with no new email sent. `list-pitch-emails`' search has no read/seen state
and no memory of prior runs, so it found the exact same message
(`1a06ec586e214db6`) again, re-extracted, re-assessed (`fit: true` again,
this time with a short one-sentence `evidenceQuote` - see the note in §1
about quote-length variance), and posted a **second, duplicate** Slack
notification (`notified: true`). Exactly the gap named and deliberately not
built in `CONTEXT.md` - confirmed rather than assumed.

## §4 Verdict

`{{PLACEHOLDER: one-paragraph honest summary once the above is filled in}}`
