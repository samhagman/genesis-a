/**
 * Unified Workers Test Setup
 * 
 * This file provides setup and teardown for all Workers runtime tests,
 * supporting both unit tests (with mocks) and integration tests (with real bindings).
 */

import { beforeEach, afterEach, vi } from "vitest";

// Test isolation utilities
let testId: string;

beforeEach(() => {
  // Generate unique test ID for isolation
  testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Store test ID globally for use in tests
  globalThis.__TEST_ID__ = testId;
  
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Increase max listeners to prevent warnings during concurrent test runs
  if (typeof process !== 'undefined' && process.setMaxListeners) {
    process.setMaxListeners(100);
  }
});

afterEach(async () => {
  // Clean up any test-specific data if using real bindings
  await cleanupTestData();
});

/**
 * Clean up test-specific data from real Cloudflare services
 */
async function cleanupTestData() {
  try {
    // Import the env from cloudflare:test for Workers runtime tests
    // This import only works in the Workers test environment
    const { env } = await import('cloudflare:test').catch(() => ({ env: null }));
    
    // Clean up R2 objects with current test prefix if env is available
    if (env?.WORKFLOW_VERSIONS && testId) {
      const objects = await env.WORKFLOW_VERSIONS.list({
        prefix: `test-${testId}/`
      });
      
      if (objects.objects.length > 0) {
        // Delete all test objects in parallel but await completion
        const deletePromises = objects.objects.map(obj => 
          env.WORKFLOW_VERSIONS.delete(obj.key)
        );
        await Promise.all(deletePromises);
      }
    }
  } catch (error) {
    // Silently ignore cleanup errors - this is expected in non-Workers test environments
    // The error is expected when running in jsdom environment or when env is not available
  }
}

/**
 * Get test-specific R2 key prefix for isolation
 */
export function getTestKeyPrefix(): string {
  return `test-${globalThis.__TEST_ID__ || 'fallback'}/`;
}

/**
 * Get test-specific workflow ID for isolation
 */
export function getTestWorkflowId(baseId: string = 'workflow'): string {
  return `test-${globalThis.__TEST_ID__ || 'fallback'}-${baseId}`;
}

/**
 * Utility to check if we're in an integration test environment
 */
export function isIntegrationTest(): boolean {
  return typeof globalThis.cloudflare !== 'undefined' && 
         !!globalThis.cloudflare?.env?.WORKFLOW_VERSIONS;
}

/**
 * Create a mock environment for unit tests
 */
export function createMockEnv() {
  const storage = new Map<string, { 
    content: string; 
    metadata?: any; 
    customMetadata?: any 
  }>();

  return {
    AI: {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          toolCalls: [],
          reasoning: "Mock AI response"
        })
      })
    },
    WORKFLOW_VERSIONS: {
      put: vi.fn(async (key: string, content: any, options?: any) => {
        const contentStr = typeof content === "string" 
          ? content 
          : new TextDecoder().decode(content);
        storage.set(key, {
          content: contentStr,
          metadata: options?.httpMetadata,
          customMetadata: options?.customMetadata,
        });
        return Promise.resolve();
      }),
      get: vi.fn(async (key: string) => {
        const item = storage.get(key);
        if (!item) return null;
        return {
          text: () => Promise.resolve(item.content),
          customMetadata: item.customMetadata || {},
          httpMetadata: item.metadata || {},
        };
      }),
      delete: vi.fn(async (key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      list: vi.fn(async (options?: { prefix?: string }) => {
        const keys = Array.from(storage.keys());
        const filteredKeys = options?.prefix
          ? keys.filter((key) => key.startsWith(options.prefix!))
          : keys;
        return {
          objects: filteredKeys.map((key) => ({
            key,
            size: storage.get(key)?.content.length || 0,
            uploaded: new Date(),
            etag: "mock-etag",
          })),
        };
      }),
      _storage: storage,
      _clear: () => storage.clear(),
    },
    Chat: {},
    OPENAI_API_KEY: "test-key",
  };
}

// Global type augmentation for test ID
declare global {
  var __TEST_ID__: string | undefined;
  var cloudflare: {
    env?: {
      WORKFLOW_VERSIONS?: R2Bucket;
      AI?: Ai;
      Chat?: DurableObjectNamespace;
      OPENAI_API_KEY?: string;
    };
  } | undefined;
}