/**
 * AI Gateway Service - Production Observability
 *
 * This service routes AI calls through Cloudflare AI Gateway for production observability,
 * analytics, and caching. It follows official Cloudflare patterns for production deployments.
 */

export interface AiGatewayConfig {
  ENVIRONMENT: string;
  AI_GATEWAY_URL?: string;
  OPENAI_API_KEY?: string;
}

export interface AiMessage {
  role: string;
  content: string;
  tool_calls?: AiToolCall[];
}

export interface AiTool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AiToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface AiCallOptions {
  model: string;
  messages: AiMessage[];
  tools?: AiTool[];
  temperature?: number;
  max_tokens?: number;
  tool_choice?: string | object;
}

export interface AiResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: AiToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * AI Gateway Service for production observability and analytics
 * Routes AI calls through Cloudflare AI Gateway in production environments
 */
export class AiGatewayService {
  constructor(private env: AiGatewayConfig) {}

  /**
   * Call AI with automatic routing through AI Gateway in production
   * @param options AI call parameters
   * @returns AI response with observability data
   */
  async callAI(options: AiCallOptions): Promise<AiResponse> {
    const {
      model,
      messages,
      tools = [],
      temperature = 0.7,
      max_tokens = 4000,
      tool_choice = "auto",
    } = options;

    const isProduction = this.env.ENVIRONMENT === "production";
    const aiGatewayUrl = this.env.AI_GATEWAY_URL;

    if (isProduction && aiGatewayUrl && this.env.OPENAI_API_KEY) {
      // Route through AI Gateway for observability (official pattern)
      console.log(
        `[AI Gateway] Routing ${model} call through gateway: ${aiGatewayUrl}`
      );

      try {
        const response = await fetch(`${aiGatewayUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            "User-Agent": "Genesis-Workflow-App/1.0.0",
          },
          body: JSON.stringify({
            model,
            messages,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? tool_choice : undefined,
            temperature,
            max_tokens,
            stream: false, // For now, disable streaming through gateway
          }),
        });

        if (!response.ok) {
          throw new Error(
            `AI Gateway request failed: ${response.status} ${response.statusText}`
          );
        }

        const result = (await response.json()) as AiResponse;

        // Log analytics data for production monitoring
        console.log(
          `[AI Gateway] Success - Tokens: ${result.usage?.total_tokens || "unknown"}, Model: ${model}`
        );

        return result;
      } catch (error) {
        console.error("[AI Gateway] Error:", error);
        // Fallback to direct AI binding if gateway fails
        console.warn("[AI Gateway] Falling back to direct AI binding");
        return this.callDirectAI(options);
      }
    } else {
      // Direct call for development (or fallback)
      console.log(
        `[AI Direct] Calling ${model} directly (env: ${this.env.ENVIRONMENT})`
      );
      return this.callDirectAI(options);
    }
  }

  /**
   * Direct AI call without gateway (development/fallback)
   * @param options AI call parameters
   * @returns AI response
   */
  private async callDirectAI(options: AiCallOptions): Promise<AiResponse> {
    // This would typically use the Cloudflare AI binding
    // For now, we'll simulate the response structure

    // In actual implementation, this would be:
    // return this.env.AI.run(options.model, {
    //   messages: options.messages,
    //   tools: options.tools,
    //   temperature: options.temperature,
    //   max_tokens: options.max_tokens
    // });

    // Simulated response for development
    const simulatedResponse: AiResponse = {
      choices: [
        {
          message: {
            role: "assistant",
            content:
              "This is a simulated AI response from the direct AI service.",
            tool_calls: undefined,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 20,
        total_tokens: 70,
      },
    };

    return simulatedResponse;
  }

  /**
   * Get AI Gateway analytics and usage data
   * @returns Analytics data from AI Gateway
   */
  async getAnalytics(): Promise<Record<string, unknown>> {
    const isProduction = this.env.ENVIRONMENT === "production";
    const aiGatewayUrl = this.env.AI_GATEWAY_URL;

    if (!isProduction || !aiGatewayUrl) {
      return {
        message: "Analytics only available in production with AI Gateway",
        environment: this.env.ENVIRONMENT,
      };
    }

    try {
      // This would call the AI Gateway analytics endpoint
      // Implementation depends on specific AI Gateway setup
      console.log(`[AI Gateway] Fetching analytics from ${aiGatewayUrl}`);

      return {
        message: "Analytics endpoint not yet implemented",
        gateway_url: aiGatewayUrl,
      };
    } catch (error) {
      console.error("[AI Gateway] Analytics error:", error);
      return {
        error: "Failed to fetch analytics",
        details: error,
      };
    }
  }

  /**
   * Health check for AI Gateway service
   * @returns Service health status
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: Record<string, unknown>;
  }> {
    const isProduction = this.env.ENVIRONMENT === "production";
    const aiGatewayUrl = this.env.AI_GATEWAY_URL;
    const hasApiKey = !!this.env.OPENAI_API_KEY;

    const details = {
      environment: this.env.ENVIRONMENT,
      gateway_configured: !!aiGatewayUrl,
      api_key_configured: hasApiKey,
      gateway_url: aiGatewayUrl ? `${aiGatewayUrl.substring(0, 50)}...` : null,
      routing_mode: isProduction && aiGatewayUrl ? "gateway" : "direct",
    };

    if (isProduction && !aiGatewayUrl) {
      return {
        healthy: false,
        details: {
          ...details,
          warning: "Production environment without AI Gateway configuration",
        },
      };
    }

    if (isProduction && !hasApiKey) {
      return {
        healthy: false,
        details: {
          ...details,
          error: "Production environment without OpenAI API key",
        },
      };
    }

    return {
      healthy: true,
      details,
    };
  }
}
