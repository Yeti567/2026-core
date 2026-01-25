/**
 * AI Client Utility
 * 
 * Provides a unified interface for AI service calls, supporting both
 * direct Anthropic API access and OpenRouter (for fallback or specific models).
 */

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIServiceOptions {
    model?: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    system?: string;
}

export interface AIResponse {
    content: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    provider: 'anthropic' | 'openrouter';
}

/**
 * Main function to call AI services
 */
export async function callAI(
    messages: Message[],
    options: AIServiceOptions = {}
): Promise<AIResponse> {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!anthropicKey && !openRouterKey) {
        throw new Error('No AI provider API keys found. Please set ANTHROPIC_API_KEY or OPENROUTER_API_KEY.');
    }

    // Prefer direct Anthropic if available, unless OpenRouter is specifically requested or Anthropic key is missing
    if (anthropicKey && !openRouterKey) {
        return callAnthropic(messages, options, anthropicKey);
    } else if (openRouterKey) {
        return callOpenRouter(messages, options, openRouterKey);
    }

    // Default to Anthropic if both are present (can be changed based on project preference)
    return callAnthropic(messages, options, anthropicKey!);
}

/**
 * Call Anthropic API directly
 */
async function callAnthropic(
    messages: Message[],
    options: AIServiceOptions,
    apiKey: string
): Promise<AIResponse> {
    const systemMessage = options.system || messages.find(m => m.role === 'system')?.content;
    const filteredMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: options.model || 'claude-3-5-sonnet-20240620',
            max_tokens: options.max_tokens || 1000,
            temperature: options.temperature,
            system: systemMessage,
            messages: filteredMessages.map(m => ({
                role: m.role === 'system' ? 'user' : m.role, // Anthropic doesn't use 'system' in messages array
                content: m.content
            }))
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic AI error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return {
        content: data.content[0]?.text || '',
        usage: {
            prompt_tokens: data.usage?.input_tokens || 0,
            completion_tokens: data.usage?.output_tokens || 0,
            total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        },
        provider: 'anthropic'
    };
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(
    messages: Message[],
    options: AIServiceOptions,
    apiKey: string
): Promise<AIResponse> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', // Optional, for OpenRouter rankings
            'X-Title': 'COR Pathways', // Optional, for OpenRouter rankings
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: options.model || 'deepseek/deepseek-chat',
            messages: options.system
                ? [{ role: 'system', content: options.system }, ...messages]
                : messages,
            max_tokens: options.max_tokens || 1000,
            temperature: options.temperature,
            top_p: options.top_p
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenRouter AI error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return {
        content: data.choices[0]?.message?.content || '',
        usage: {
            prompt_tokens: data.usage?.prompt_tokens || 0,
            completion_tokens: data.usage?.completion_tokens || 0,
            total_tokens: data.usage?.total_tokens || 0
        },
        provider: 'openrouter'
    };
}
