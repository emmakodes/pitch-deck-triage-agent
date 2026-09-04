# Results

Real output only - no invented numbers. Fill each section as you work through
`RUNBOOK.md`.

## Environment

- Nango dev environment, integrations: `google-mail`, `slack`
- Gmail connection ID: `{{PLACEHOLDER}}`
- Slack connection ID: `{{PLACEHOLDER}}`
- `list-pitch-emails` dryrun output (empty, before step 3): `{{PLACEHOLDER}}`

## §1 First live Triage Run

`{{PLACEHOLDER: full console dump from `npm run triage`}}`

Notes on anything `mcp-client.ts` got wrong on the first real call against
`https://api.nango.dev/mcp` (header name, session handling, SSE framing) -
this is the one part of the build with no prior art from the Linear sample.

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
