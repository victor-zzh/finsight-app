import { createGroq } from "@ai-sdk/groq";
import { createXai } from "@ai-sdk/xai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  type LanguageModelV1,
  type LanguageModelV1CallOptions,
} from "@ai-sdk/provider";

import {
  customProvider,
  wrapLanguageModel,
  extractReasoningMiddleware
} from "ai";

export interface ModelInfo {
  provider: string;
  name: string;
  description: string;
  apiVersion: string;
  capabilities: string[];
}

const middleware = extractReasoningMiddleware({
  tagName: 'think',
});

// Helper to get API keys from environment variables first, then localStorage
const getApiKey = (key: string): string | undefined => {
  // Check for environment variables first
  if (process.env[key]) {
    return process.env[key] || undefined;
  }

  // Fall back to localStorage if available
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(key) || undefined;
  }

  return undefined;
};

const GROQ_API_KEY = getApiKey('GROQ_API_KEY');
const XAI_API_KEY = getApiKey('XAI_API_KEY');
const GLM_API_KEY = getApiKey('GLM_API_KEY');

const groqClient = GROQ_API_KEY
  ? createGroq({
      apiKey: GROQ_API_KEY,
    })
  : null;

const xaiClient = XAI_API_KEY
  ? createXai({
      apiKey: XAI_API_KEY,
    })
  : null;

const glmClient = GLM_API_KEY
  ? createOpenAI({
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: GLM_API_KEY,
      name: 'glm',
      compatibility: 'compatible',
    })
  : null;

const extractLastUserMessage = (prompt: LanguageModelV1CallOptions['prompt']): string | undefined => {
  for (let index = prompt.length - 1; index >= 0; index -= 1) {
    const message = prompt[index];
    if (message.role === 'user') {
      return message.content
        .map((part) => (part.type === 'text' ? part.text : ''))
        .filter(Boolean)
        .join('\n')
        .trim() || undefined;
    }
  }

  return undefined;
};

const createUsage = (text: string, promptLength: number) => ({
  promptTokens: Math.max(1, promptLength),
  completionTokens: Math.max(1, Math.ceil(text.split(/\s+/).length)),
});

const createMockLanguageModel = (modelId: string): LanguageModelV1 => {
  const buildContent = (options: LanguageModelV1CallOptions) => {
    const lastMessage = extractLastUserMessage(options.prompt);
    if (lastMessage) {
      return `Mock response for "${lastMessage}". Add a valid API key in the API Key Settings to use ${modelId}.`;
    }
    return `Mock response from ${modelId}. Add a valid API key in the API Key Settings to use the real model.`;
  };

  const createRawCall = (options: LanguageModelV1CallOptions) => ({
    rawPrompt: options.prompt,
    rawSettings: {
      mode: options.mode.type,
      hasTools: Array.isArray(options.mode.tools) ? options.mode.tools.length > 0 : false,
      inputFormat: options.inputFormat,
      mock: true,
    },
  });

  return {
    specificationVersion: 'v1',
    provider: 'mock',
    modelId,
    defaultObjectGenerationMode: undefined,
    supportsStructuredOutputs: false,
    async doGenerate(options) {
      const text = buildContent(options);
      return {
        text,
        finishReason: 'stop',
        usage: createUsage(text, options.prompt.length),
        rawCall: createRawCall(options),
      };
    },
    async doStream(options) {
      const text = buildContent(options);
      const usage = createUsage(text, options.prompt.length);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-delta', textDelta: text });
          controller.enqueue({ type: 'finish', finishReason: 'stop', usage });
          controller.close();
        },
      });

      return {
        stream,
        rawCall: createRawCall(options),
      };
    },
  } satisfies LanguageModelV1;
};

const createResilientLanguageModel = (
  primary: LanguageModelV1 | null,
  modelId: string,
): LanguageModelV1 => {
  const fallback = createMockLanguageModel(modelId);

  if (!primary) {
    return fallback;
  }

  let primaryOperational = true;

  const runWithFallback = async <T>(
    executor: () => PromiseLike<T>,
    fallbackExecutor: () => PromiseLike<T>,
    context: 'doStream' | 'doGenerate',
  ): Promise<T> => {
    if (!primaryOperational) {
      return fallbackExecutor();
    }

    try {
      return await executor();
    } catch (error) {
      primaryOperational = false;
      console.error(
        `Primary model "${modelId}" failed during ${context}, switching to mock model.`,
        error,
      );
      return fallbackExecutor();
    }
  };

  return {
    specificationVersion: 'v1',
    provider: primary.provider,
    modelId: primary.modelId,
    defaultObjectGenerationMode: primary.defaultObjectGenerationMode,
    supportsStructuredOutputs: primary.supportsStructuredOutputs,
    supportsImageUrls: primary.supportsImageUrls,
    supportsUrl: primary.supportsUrl?.bind(primary),
    async doGenerate(options) {
      return runWithFallback(
        () => primary.doGenerate(options),
        () => fallback.doGenerate(options),
        'doGenerate',
      );
    },
    async doStream(options) {
      return runWithFallback(
        () => primary.doStream(options),
        () => fallback.doStream(options),
        'doStream',
      );
    },
  } satisfies LanguageModelV1;
};

const languageModels = {
  "qwen3-32b": wrapLanguageModel({
    model: createResilientLanguageModel(
      groqClient ? groqClient('qwen/qwen3-32b') : null,
      'qwen3-32b',
    ),
    middleware
  }),
  "grok-3-mini": wrapLanguageModel({
    model: createResilientLanguageModel(
      xaiClient ? xaiClient('grok-3-mini-latest') : null,
      'grok-3-mini',
    ),
    middleware
  }),
  "kimi-k2": wrapLanguageModel({
    model: createResilientLanguageModel(
      groqClient ? groqClient('moonshotai/kimi-k2-instruct') : null,
      'kimi-k2',
    ),
    middleware
  }),
  "llama4": wrapLanguageModel({
    model: createResilientLanguageModel(
      groqClient ? groqClient('meta-llama/llama-4-scout-17b-16e-instruct') : null,
      'llama4',
    ),
    middleware
  }),
  "glm-4-air": wrapLanguageModel({
    model: createResilientLanguageModel(
      glmClient ? glmClient('glm-4-air') : null,
      'glm-4-air',
    ),
    middleware
  })
};

export const modelDetails: Record<keyof typeof languageModels, ModelInfo> = {
  "kimi-k2": {
    provider: "Groq",
    name: "Kimi K2",
    description: "Latest version of Moonshot AI's Kimi K2 with good balance of capabilities.",
    apiVersion: "kimi-k2-instruct",
    capabilities: ["Balanced", "Efficient", "Agentic"]
  },
  "qwen3-32b": {
    provider: "Groq",
    name: "Qwen 3 32B",
    description: "Latest version of Alibaba's Qwen 32B with strong reasoning and coding capabilities.",
    apiVersion: "qwen3-32b",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "grok-3-mini": {
    provider: "XAI",
    name: "Grok 3 Mini",
    description: "Latest version of XAI's Grok 3 Mini with strong reasoning and coding capabilities.",
    apiVersion: "grok-3-mini-latest",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "llama4": {
    provider: "Groq",
    name: "Llama 4",
    description: "Latest version of Meta's Llama 4 with good balance of capabilities.",
    apiVersion: "llama-4-scout-17b-16e-instruct",
    capabilities: ["Balanced", "Efficient", "Agentic"]
  },
  "glm-4-air": {
    provider: "GLM",
    name: "GLM-4 Air",
    description: "Zhipu AI's GLM-4 Air with strong Chinese capabilities and cost-effective tool use.",
    apiVersion: "glm-4-air",
    capabilities: ["Reasoning", "Balanced", "Agentic"]
  }
};

// Update API keys when localStorage changes (for runtime updates)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // Reload the page if any API key changed to refresh the providers
    if (event.key?.includes('API_KEY')) {
      window.location.reload();
    }
  });
}

export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "kimi-k2";
