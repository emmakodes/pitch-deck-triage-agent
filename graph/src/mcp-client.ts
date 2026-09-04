/**
 * Minimal MCP "Streamable HTTP" client - just enough to call one tool on
 * Nango's hosted MCP server per graph node.
 *
 * This is deliberately not an SDK MCP client, and not OpenAI's hosted
 * `type: 'mcp'` tool the way the Linear sample used it: the whole point of
 * the Triage Graph (see CONTEXT.md) is that the graph decides which tool
 * runs when - no LLM ever sees Nango's tool list here. MCP is transport,
 * not delegated judgment.
 *
 * Each call is scoped to one Nango connection via the `connection-id` and
 * `provider-config-key` headers, and this build talks to two different
 * connections (Gmail, Slack) across one Triage Run - so a call opens its own
 * short-lived session rather than sharing one client across providers.
 *
 * NB: the initialize/session handshake below follows the MCP "Streamable
 * HTTP" transport spec (2025-03-26 revision). Unlike everything else in this
 * repo, it has no prior art in the Linear sample (that one let OpenAI's
 * platform own the wire protocol) - verify it against a live run before
 * trusting it.
 */

const NANGO_MCP_URL = 'https://api.nango.dev/mcp';

export interface McpScope {
    connectionId: string;
    providerConfigKey: string;
}

interface JsonRpcResponse {
    jsonrpc: '2.0';
    id?: number;
    result?: unknown;
    error?: { code: number; message: string; data?: unknown };
}

interface McpToolResult {
    isError?: boolean;
    content?: { type: string; text?: string }[];
}

function headersFor(secretKey: string, scope: McpScope): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${secretKey}`,
        'connection-id': scope.connectionId,
        'provider-config-key': scope.providerConfigKey
    };
}

async function parseBody(res: Response): Promise<JsonRpcResponse | undefined> {
    const contentType = res.headers.get('content-type') ?? '';
    const body = await res.text();
    if (!body) {
        return undefined;
    }

    if (contentType.includes('text/event-stream')) {
        // SSE framing: one or more "data: <json>" lines - the response we
        // want is the last one.
        const dataLines = body
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice('data:'.length).trim());
        const last = dataLines.at(-1);
        return last ? (JSON.parse(last) as JsonRpcResponse) : undefined;
    }

    return JSON.parse(body) as JsonRpcResponse;
}

let nextId = 1;

async function rpc(headers: Record<string, string>, method: string, params?: unknown): Promise<unknown> {
    const res = await fetch(NANGO_MCP_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params })
    });
    if (!res.ok) {
        throw new Error(`MCP ${method} failed: HTTP ${res.status} ${await res.text()}`);
    }
    const parsed = await parseBody(res);
    if (parsed?.error) {
        throw new Error(`MCP ${method} error: ${JSON.stringify(parsed.error)}`);
    }
    return parsed?.result;
}

/**
 * Call exactly one Nango MCP tool, scoped to one connection. Opens a fresh
 * initialize handshake per call - a little wasteful, but it keeps each
 * node's Nango scoping self-contained instead of threading a shared session
 * through the graph.
 */
export async function callNangoTool<T = unknown>(secretKey: string, scope: McpScope, toolName: string, args: Record<string, unknown>): Promise<T> {
    const headers = headersFor(secretKey, scope);

    await rpc(headers, 'initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'pitch-deck-triage-graph', version: '1.0.0' }
    });

    // Required notification - no response expected, fire and ignore.
    await fetch(NANGO_MCP_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
    }).catch(() => undefined);

    const result = (await rpc(headers, 'tools/call', { name: toolName, arguments: args })) as McpToolResult | undefined;

    // MCP tool failures surface via `isError` on the result, not the
    // JSON-RPC error field checked in rpc() above - check both.
    if (result?.isError) {
        throw new Error(`Nango tool "${toolName}" failed: ${JSON.stringify(result.content)}`);
    }

    const textBlock = result?.content?.find((c) => c.type === 'text' && typeof c.text === 'string');
    if (!textBlock?.text) {
        throw new Error(`Nango tool "${toolName}" returned no text content: ${JSON.stringify(result)}`);
    }
    return JSON.parse(textBlock.text) as T;
}
