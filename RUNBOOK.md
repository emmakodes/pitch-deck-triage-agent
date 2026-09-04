# Runbook — from clone to submitted

Everything that needs your accounts and a browser. Do it in order. Paste real
output into `RESULTS.md` as you go — same as the Linear sample, the write-up's
credibility is that file.

---

## 0. Prereqs (~15 min)

- [ ] **Nango**: reuse your existing app.nango.dev account (from the Linear
      sample) or sign up fresh. Dashboard → *Environment Settings* → copy the
      **Secret Key** (dev).
- [ ] **Gmail integration**: Nango dashboard → *Integrations* → New → search
      **Gmail** → the "Nango developer app" tab pre-fills a working OAuth app
      (same pattern as Linear last time) → *Create*. Note the integration ID
      (`google-mail` unless you rename it).
- [ ] **Slack integration**: *Integrations* → New → search **Slack** →
      Nango's pre-filled dev app → *Create*. Note the integration ID
      (`slack` unless renamed).
- [ ] **Slack channel**: create (or pick) a channel for the notification,
      e.g. `#pitch-triage`. You'll authorize the Nango dev app into your
      Slack workspace when you connect below - make sure it ends up a member
      of that channel (Slack normally does this automatically for a bot
      token during OAuth; if a later post fails with `not_in_channel`,
      `/invite` it manually).
- [ ] **OpenAI**: have an API key with Responses API + structured outputs
      access (same key as the Linear sample works fine).

## 1. Connect your accounts (~10 min)

In the Nango dashboard:

- [ ] *Connections* → Add connection → **Gmail** → complete the Google OAuth
      popup with your own Gmail account → note the **connection ID**.
- [ ] *Connections* → Add connection → **Slack** → complete the OAuth popup,
      authorizing your workspace → note the **connection ID**.

## 2. Deploy the actions (~10 min)

```bash
cd integration
cp .env.example .env
# put your Nango secret key in NANGO_SECRET_KEY_DEV
npm install
npx nango deploy dev
```

Sanity check from the CLI (optional, replace `<gmail-connection-id>`):

```bash
npx nango dryrun list-pitch-emails <gmail-connection-id>
```

Expect `{ "candidates": [] }` until step 3 gives it something to find. Copy
the output into `RESULTS.md` §Environment.

## 3. Send yourself a test Pitch Deck (~5 min)

```bash
cd ../graph
cp .env.example .env
npm install
npm run generate-decks
```

This writes three fabricated sample decks to `../decks/`:
`quantumleap-fit.pdf` (should fit the Thesis), `fieldnote-no-fit-consumer.pdf`
and `brightforge-no-fit-hardware.pdf` (should not). Email one to yourself
(the same Gmail account you connected in step 1) as a PDF attachment, subject
line whatever you like - the search query in
`integration/google-mail/actions/list-pitch-emails.ts` just looks for
`has:attachment filename:pdf newer_than:30d`.

Re-run the `list-pitch-emails` dryrun from step 2 - it should now return one
candidate.

## 4. Fill in `graph/.env` and run a Triage Run (~5 min)

```
OPENAI_API_KEY=...
NANGO_SECRET_KEY=...              # same secret key as integration/.env
NANGO_GMAIL_CONNECTION_ID=...
NANGO_SLACK_CONNECTION_ID=...
SLACK_CHANNEL=#pitch-triage        # or a channel ID
```

```bash
npm run triage
```

Expect: it fetches the email, extracts the deck's text, gets a Fit Assessment
from OpenAI, and - if `fit: true` - posts to Slack. Confirm the message
landed in the channel and paste the whole console dump into `RESULTS.md` §1.

**This is the part with no prior art from the Linear sample** - the MCP calls
in `graph/src/mcp-client.ts` are a hand-rolled JSON-RPC client against
Nango's hosted MCP server, never exercised end-to-end before this run.
Whatever breaks first (wrong header name, session handling, SSE parsing) is
likely real material for the write-up - capture the exact error.

## 5. Run all three decks, and the Reprocessing Gap (~10 min)

Repeat step 3 with the other two fabricated decks (send each to yourself,
`npm run triage` after each lands) and confirm: the fit deck notifies Slack,
the two no-fit decks don't. Record all three Fit Assessments (including the
`evidenceQuote`) in `RESULTS.md` §2.

Then demonstrate the Reprocessing Gap on purpose: run `npm run triage` again
right after a fit deck's successful run, with no new email sent. Confirm it
either re-finds the same email (Gmail's search doesn't know it was already
handled) and posts a second, duplicate Slack notification, or - if you
narrowed the Gmail query with `is:unread` and Gmail auto-marked it read -
returns no candidates instead. Either result is worth recording exactly as
it happens. → `RESULTS.md` §3.

## 6. Write the post

Same conventions as the Linear sample: honest first-person, every number
from a real run, code + a real gotcha. Prime candidates already visible:
the Gmail metadata-then-content two-step, the MCP-as-transport-not-agent
architecture choice, whatever `mcp-client.ts` gets wrong on the first live
call, and the stitched-vs-contiguous evidence-quote fix already caught
during the build (see `graph/src/assess.ts`'s schema description).

## 7. Publish + submit

- [ ] Commit: `git add -A && git commit -m "Fill in run results" && git push`
- [ ] dev.to → *Create Post* → paste `post/draft.md`, set `published: true`.
      Get the URL.
- [ ] Add the dev.to URL to the top of `README.md`, commit, push.
- [ ] Application form: dev.to link in the work-sample field, repo link
      second, paste `pitch.md` into the "why you" box.

Done.
