import { model, type modelID } from "@/ai/providers";
import { smoothStream, streamText, type UIMessage } from "ai";
import { appendResponseMessages } from 'ai';
import { saveChat, saveMessages, convertToDBMessages } from '@/lib/chat-store';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { initializeMCPClients, type MCPServerConfig } from '@/lib/mcp-client';
import { generateTitle } from '@/app/actions';
import fs from 'fs';
import path from 'path';

import { checkBotId } from "botid/server";

export async function POST(req: Request) {
  const {
    messages,
    chatId,
    selectedModel,
    userId,
    mcpServers = [],
  }: {
    messages: UIMessage[];
    chatId?: string;
    selectedModel: modelID;
    userId: string;
    mcpServers?: MCPServerConfig[];
  } = await req.json();

  const { isBot, isVerifiedBot } = await checkBotId();

  if (isBot && !isVerifiedBot) {
    return new Response(
      JSON.stringify({ error: "Bot is not allowed to access this endpoint" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "User ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const id = chatId || nanoid();

  const normalizedMessages: UIMessage[] = messages.map((message) => {
    if (Array.isArray(message.parts) && message.parts.length > 0) {
      return message;
    }

    const rawContent = typeof message.content === 'string'
      ? message.content
      : Array.isArray((message as any).content)
        ? (message as any).content.join('\n')
        : '';

    return {
      ...message,
      parts: rawContent
        ? [{ type: 'text', text: rawContent }]
        : [],
    } satisfies UIMessage;
  });

  // 🔄 Database operations disabled - Real-time analysis mode
  // Chat history is not saved to database for now
  console.log("💡 Real-time analysis mode: Database operations skipped");

  // // Check if chat already exists for the given ID
  // // If not, create it now
  // let isNewChat = false;
  // if (chatId) {
  //   try {
  //     const existingChat = await db.query.chats.findFirst({
  //       where: and(
  //         eq(chats.id, chatId),
  //         eq(chats.userId, userId)
  //       )
  //     });
  //     isNewChat = !existingChat;
  //   } catch (error) {
  //     console.error("Error checking for existing chat:", error);
  //     isNewChat = true;
  //   }
  // } else {
  //   // No ID provided, definitely new
  //   isNewChat = true;
  // }

  // // If it's a new chat, save it immediately
  // if (isNewChat && messages.length > 0) {
  //   try {
  //     // Generate a title based on first user message
  //     const userMessage = messages.find(m => m.role === 'user');
  //     let title = 'New Chat';

  //     if (userMessage) {
  //       try {
  //         title = await generateTitle([userMessage]);
  //       } catch (error) {
  //         console.error("Error generating title:", error);
  //       }
  //     }

  //     // Save the chat immediately so it appears in the sidebar
  //     await saveChat({
  //       id,
  //       userId,
  //       title,
  //       messages: [],
  //     });
  //   } catch (error) {
  //     console.error("Error saving new chat:", error);
  //   }
  // }

  // Load MCP configuration from file and merge with request mcpServers
  const allMCPServers: MCPServerConfig[] = [...mcpServers];
  
  try {
    const mcpConfigPath = path.join(process.cwd(), 'mcp-servers.json');
    if (fs.existsSync(mcpConfigPath)) {
      const mcpConfigContent = fs.readFileSync(mcpConfigPath, 'utf-8');
      const mcpConfig = JSON.parse(mcpConfigContent);
      
      // Convert config format to MCPServerConfig[]
      if (mcpConfig.mcpServers) {
        Object.values(mcpConfig.mcpServers).forEach((config: any) => {
          const resolvedCommand = config.command
            ? (path.isAbsolute(config.command)
              ? config.command
              : (config.command.startsWith('.') || config.command.includes(path.sep)
                ? path.join(process.cwd(), config.command)
                : config.command))
            : undefined;

          if (resolvedCommand) {
            allMCPServers.push({
              type: 'stdio',
              command: resolvedCommand,
              args: config.args,
              cwd: config.cwd ? path.join(process.cwd(), config.cwd) : undefined,
              env: config.env
            });
          }
        });

        console.log(`✅ Loaded ${Object.keys(mcpConfig.mcpServers).length} MCP server(s) from config file`);
      }
    }
  } catch (error) {
    console.error('Failed to load MCP config file:', error);
    // Continue without file-based config
  }

  // Initialize MCP clients (both HTTP/SSE and STDIO)
  const { tools, cleanup } = await initializeMCPClients(allMCPServers, req.signal);

  console.log("messages", normalizedMessages);
  console.log("parts", normalizedMessages.map((m) => m.parts.map((p) => p)));

  // Track if the response has completed
  let responseCompleted = false;

  // Build enhanced system prompt based on available tools
  const hasAShareTools = Object.keys(tools).some(key => 
    ['get_stock_info', 'get_financial_report', 'search_stock_by_name', 'analyze_company'].includes(key)
  );

  const systemPrompt = hasAShareTools ? 
    `你是专业的A股投资分析助手，精通财务分析和风险评估。

**今天日期**：${new Date().toISOString().split('T')[0]}

## 可用工具

你可以使用以下工具实时查询A股数据：

1. **analyze_company** - 输入公司名称或股票代码，自动完成代码匹配、基本面、财务报表与指标合集。
2. **search_stock_by_name** - 根据公司名称搜索股票代码
3. **get_stock_info** - 获取股票基本信息（6位代码）
4. **get_financial_report** - 获取财务报表（利润表/资产负债表/现金流量表）
5. **get_financial_indicators** - 获取多年度财务指标（ROE、毛利率等）
6. **get_st_list** - 获取ST股票列表

## 使用规则

- 优先尝试使用 analyze_company 快速获取综合结果
- 如需更精细控制，可先用 search_stock_by_name 查代码，再调用其他工具
- 使用Markdown表格展示数据
- 风险点用 ⚠️ 标记，正向用 ✅
- 标注数据来源和免责声明

## 示例输出

# 贵州茅台 (600519)
- 📊 行业：酿酒
- 💰 市值：1.77万亿

| 指标 | 数值 | 评价 |
|-----|------|------|
| ROE | 33.5% | ✅ 优秀 |

⚠️ 数据仅供参考，不构成投资建议
` : 
    `You are a helpful assistant with access to a variety of tools.

Today's date is ${new Date().toISOString().split('T')[0]}.

Use the tools to answer questions. Multiple tools can be used in a single response.

## Response Format
- Markdown is supported
- Use tools to find answers
- If unsure, say you don't know
`;

  const result = streamText({
    model: model.languageModel(selectedModel),
    system: systemPrompt,
    messages: normalizedMessages,
    tools,
    maxSteps: 20,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 2048,
        },
      },
      anthropic: {
        thinking: {
          type: 'enabled',
          budgetTokens: 12000
        },
      }
    },
    experimental_transform: smoothStream({
      delayInMs: 5, // optional: defaults to 10ms
      chunking: 'line', // optional: defaults to 'word'
    }),
    onError: (error) => {
      console.error(JSON.stringify(error, null, 2));
    },
    async onFinish({ response }) {
      responseCompleted = true;
      
      // 🔄 Database save disabled - Real-time analysis mode
      console.log("💡 Response completed - Database save skipped");
      
      // const allMessages = appendResponseMessages({
      //   messages,
      //   responseMessages: response.messages,
      // });

      // await saveChat({
      //   id,
      //   userId,
      //   messages: allMessages,
      // });

      // const dbMessages = convertToDBMessages(allMessages, id);
      // await saveMessages({ messages: dbMessages });

      // Clean up resources - now this just closes the client connections
      // not the actual servers which persist in the MCP context
      await cleanup();
    }
  });

  // Ensure cleanup happens if the request is terminated early
  req.signal.addEventListener('abort', async () => {
    if (!responseCompleted) {
      console.log("Request aborted, cleaning up resources");
      try {
        await cleanup();
      } catch (error) {
        console.error("Error during cleanup on abort:", error);
      }
    }
  });

  result.consumeStream()
  // Add chat ID to response headers so client can know which chat was created
  return result.toDataStreamResponse({
    sendReasoning: true,
    headers: {
      'X-Chat-ID': id
    },
    getErrorMessage: (error) => {
      if (error instanceof Error) {
        if (error.message.includes("Rate limit")) {
          return "Rate limit exceeded. Please try again later.";
        }
      }
      console.error(error);
      return "An error occurred.";
    },
  });
}