import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface MCPServerConfig {
  url?: string;
  type: 'sse' | 'http' | 'stdio';
  headers?: KeyValuePair[];
  // stdio specific options
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface MCPClientManager {
  tools: Record<string, any>;
  clients: any[];
  cleanup: () => Promise<void>;
}

/**
 * Initialize MCP clients for API calls
 * This uses the already running persistent HTTP or SSE servers
 */
export async function initializeMCPClients(
  mcpServers: MCPServerConfig[] = [],
  abortSignal?: AbortSignal
): Promise<MCPClientManager> {
  // Initialize tools
  let tools = {};
  const mcpClients: any[] = [];

  // Process each MCP server configuration
  for (const mcpServer of mcpServers) {
    try {
      let transport;

      if (mcpServer.type === 'stdio') {
        // STDIO transport for local MCP servers
        if (!mcpServer.command) {
          throw new Error('STDIO transport requires a command');
        }

        transport = new StdioClientTransport({
          command: mcpServer.command,
          args: mcpServer.args || [],
          env: {
            ...Object.fromEntries(
              Object.entries(process.env).filter(([, v]) => v !== undefined)
            ) as Record<string, string>,
            ...mcpServer.env
          },
          ...(mcpServer.cwd && { cwd: mcpServer.cwd })
        });

        console.log(`Initializing STDIO MCP client: ${mcpServer.command} ${mcpServer.args?.join(' ')}`);
      } else {
        // HTTP/SSE transport for remote MCP servers
        const headers = mcpServer.headers?.reduce((acc, header) => {
          if (header.key) acc[header.key] = header.value || '';
          return acc;
        }, {} as Record<string, string>);

        transport = mcpServer.type === 'sse'
          ? {
            type: 'sse' as const,
            url: mcpServer.url!,
            headers,
          }
          : new StreamableHTTPClientTransport(new URL(mcpServer.url!), {
            requestInit: {
              headers,
            },
          });

        console.log(`Initializing ${mcpServer.type.toUpperCase()} MCP client: ${mcpServer.url}`);
      }

      const mcpClient = await createMCPClient({ transport });
      mcpClients.push(mcpClient);

      const mcptools = await mcpClient.tools();

      const toolNames = Object.keys(mcptools);
      console.log(`✅ MCP tools available: ${toolNames.join(', ')}`);

      // Add MCP tools to tools object
      tools = { ...tools, ...mcptools };
    } catch (error) {
      console.error("Failed to initialize MCP client:", error);
      // Continue with other servers instead of failing the entire request
    }
  }

  // Register cleanup for all clients if an abort signal is provided
  if (abortSignal && mcpClients.length > 0) {
    abortSignal.addEventListener('abort', async () => {
      await cleanupMCPClients(mcpClients);
    });
  }

  return {
    tools,
    clients: mcpClients,
    cleanup: async () => await cleanupMCPClients(mcpClients)
  };
}

/**
 * Clean up MCP clients
 */
async function cleanupMCPClients(clients: any[]): Promise<void> {
  await Promise.all(
    clients.map(async (client) => {
      try {
        await client.disconnect?.();
      } catch (error) {
        console.error("Error during MCP client cleanup:", error);
      }
    })
  );
} 