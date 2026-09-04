/**
 * Entry point for one Triage Run (see CONTEXT.md).
 *
 *   npm run triage
 *
 * Env (graph/.env): OPENAI_API_KEY, NANGO_SECRET_KEY,
 * NANGO_GMAIL_CONNECTION_ID, NANGO_SLACK_CONNECTION_ID, SLACK_CHANNEL.
 */
import 'dotenv/config';
import OpenAI from 'openai';
import { buildTriageGraph } from './pipeline.ts';

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) {
        throw new Error(`Missing env var ${name} - see .env.example`);
    }
    return v;
}

const openai = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });

const graph = buildTriageGraph({
    nangoSecretKey: requireEnv('NANGO_SECRET_KEY'),
    gmailConnectionId: requireEnv('NANGO_GMAIL_CONNECTION_ID'),
    slackConnectionId: requireEnv('NANGO_SLACK_CONNECTION_ID'),
    slackChannel: requireEnv('SLACK_CHANNEL'),
    openai
});

const started = Date.now();
const result = await graph.invoke({});
const elapsed = Date.now() - started;

console.log(`\n--- Triage Run (${elapsed} ms) ---`);
console.log(JSON.stringify(result, null, 2));
