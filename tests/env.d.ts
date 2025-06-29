/**
 * Environment type definitions for Cloudflare Workers testing
 *
 * This file defines the types for bindings available in tests when using
 * @cloudflare/vitest-pool-workers with real Cloudflare runtime.
 *
 * The bindings are automatically injected from wrangler.jsonc configuration.
 */

// Extend the Cloudflare test environment interface
declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    // R2 bucket for workflow version storage
    WORKFLOW_VERSIONS: R2Bucket;

    // AI binding for natural language processing
    AI: Ai;

    // Durable Object for chat functionality
    Chat: DurableObjectNamespace;

    // Optional environment variables that might be set
    OPENAI_API_KEY?: string;
  }
}

// Re-export the generated Env interface from wrangler types
// This ensures we have all the proper Cloudflare Workers types
export type { Env } from "@cloudflare/workers-types";

// Helper type for test environment setup
export interface TestEnvironment {
  WORKFLOW_VERSIONS: R2Bucket;
  AI: Ai;
  Chat: DurableObjectNamespace;
  OPENAI_API_KEY?: string;
}

// Test helper types for mocking when needed
export interface MockR2Object {
  text(): Promise<string>;
  customMetadata?: Record<string, string>;
  httpMetadata?: Record<string, string>;
}

export interface MockR2Bucket {
  get(key: string): Promise<MockR2Object | null>;
  put(key: string, content: string | Uint8Array, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{
    objects: Array<{
      key: string;
      size: number;
      uploaded: Date;
      etag: string;
    }>;
  }>;
}

// Export common test constants
export const TEST_WORKFLOW_ID = "test-workflow-123";
export const TEST_USER_ID = "test-user";
export const TEST_SESSION_ID = "test-session-456";

// Helper functions for test isolation
export function getTestWorkflowId(baseId: string = "workflow"): string {
  const testId = globalThis.__TEST_ID__ || "fallback";
  return `test-${testId}-${baseId}`;
}

export function getTestKeyPrefix(): string {
  const testId = globalThis.__TEST_ID__ || "fallback";
  return `test-${testId}/`;
}
