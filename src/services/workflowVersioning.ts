/**
 * Workflow Versioning Service
 *
 * Provides immutable version control for WorkflowTemplateV2 using Cloudflare R2.
 * Every successful edit creates a new version with complete audit trail.
 *
 * Key Features:
 * - Immutable storage in R2 (no in-place updates)
 * - Version metadata tracking with edit summaries
 * - Simple revert functionality
 * - Atomic operations with rollback capability
 */

import type { WorkflowTemplateV2 } from "../types/workflow-v2";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WorkflowVersion {
  version: number;
  templateId: string;
  createdAt: string;
  createdBy: string;
  editSummary: string; // AI-generated summary of what changed
  filePath: string; // R2 object path
  fileSize?: number; // File size in bytes
  checksum?: string; // For integrity validation
}

export interface WorkflowVersionIndex {
  templateId: string;
  currentVersion: number;
  versions: WorkflowVersion[];
  createdAt: string;
  lastModified: string;
}

export interface VersioningOptions {
  userId?: string;
  editSummary?: string;
  skipDuplicateCheck?: boolean;
}

export interface VersioningResult {
  success: boolean;
  version?: number;
  filePath?: string;
  errorMessage?: string;
  skipped?: boolean; // True if no changes detected
}

export interface VersionListOptions {
  limit?: number;
  offset?: number;
  includeContent?: boolean;
}

export interface VersionWithContent extends WorkflowVersion {
  content?: WorkflowTemplateV2;
}

// ============================================================================
// Core Versioning Service
// ============================================================================

export class WorkflowVersioningService {
  private readonly basePrefix = "workflows";

  constructor(private r2: R2Bucket) {}

  /**
   * Save a new version of a workflow template
   */
  async saveVersion(
    templateId: string,
    workflow: WorkflowTemplateV2,
    options: VersioningOptions = {}
  ): Promise<VersioningResult> {
    try {
      console.log(`Saving new version for workflow ${templateId}`);

      // Load current index
      const index = await this.loadVersionIndex(templateId);
      const nextVersion = index.currentVersion + 1;

      // Check for duplicates if requested
      if (!options.skipDuplicateCheck && index.versions.length > 0) {
        const isDuplicate = await this.isDuplicateWorkflow(
          templateId,
          workflow,
          index.currentVersion
        );
        if (isDuplicate) {
          return {
            success: true,
            skipped: true,
            version: index.currentVersion,
          };
        }
      }

      // Generate file path
      const filePath = this.getWorkflowPath(templateId, nextVersion);

      // Serialize workflow
      const workflowContent = JSON.stringify(workflow, null, 2);
      const contentBytes = new TextEncoder().encode(workflowContent);

      // Generate checksum for integrity
      const checksum = await this.generateChecksum(contentBytes);

      // Save workflow content to R2
      await this.r2.put(filePath, contentBytes, {
        httpMetadata: {
          contentType: "application/json",
          cacheControl: "public, max-age=31536000", // 1 year cache for immutable versions
        },
        customMetadata: {
          templateId,
          version: nextVersion.toString(),
          checksum,
          createdBy: options.userId || "system",
          timestamp: new Date().toISOString(),
        },
      });

      // Create version metadata
      const versionMetadata: WorkflowVersion = {
        version: nextVersion,
        templateId,
        createdAt: new Date().toISOString(),
        createdBy: options.userId || "system",
        editSummary: options.editSummary || `Version ${nextVersion}`,
        filePath,
        fileSize: contentBytes.length,
        checksum,
      };

      // Update index
      const updatedIndex: WorkflowVersionIndex = {
        ...index,
        currentVersion: nextVersion,
        versions: [...index.versions, versionMetadata],
        lastModified: new Date().toISOString(),
      };

      // Save updated index
      await this.saveVersionIndex(templateId, updatedIndex);

      console.log(
        `Successfully saved workflow ${templateId} version ${nextVersion}`
      );

      return {
        success: true,
        version: nextVersion,
        filePath,
      };
    } catch (error) {
      // SLC MVP: Re-throw corruption errors as fatal
      if (
        error instanceof Error &&
        error.message.includes("Corrupted workflow index")
      ) {
        throw error;
      }

      console.error("Error saving workflow version:", error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Load a specific version of a workflow template
   */
  async loadVersion(
    templateId: string,
    version: number
  ): Promise<WorkflowTemplateV2 | undefined> {
    try {
      const filePath = this.getWorkflowPath(templateId, version);

      const object = await this.r2.get(filePath);
      if (!object) {
        console.warn(`Workflow ${templateId} version ${version} not found`);
        return undefined;
      }

      const content = await object.text();
      const workflow = JSON.parse(content) as WorkflowTemplateV2;

      // Validate checksum if available
      const storedChecksum = object.customMetadata?.checksum;
      if (storedChecksum) {
        const actualChecksum = await this.generateChecksum(
          new TextEncoder().encode(content)
        );
        if (actualChecksum !== storedChecksum) {
          console.error(`Checksum mismatch for ${templateId} v${version}`);
          throw new Error("Workflow data integrity check failed");
        }
      }

      return workflow;
    } catch (error) {
      console.error(
        `Error loading workflow version ${templateId} v${version}:`,
        error
      );
      return undefined;
    }
  }

  /**
   * Load the current (latest) version of a workflow template
   */
  async loadCurrentVersion(
    templateId: string
  ): Promise<WorkflowTemplateV2 | undefined> {
    const index = await this.loadVersionIndex(templateId);
    if (index.currentVersion === 0) {
      return undefined;
    }

    return await this.loadVersion(templateId, index.currentVersion);
  }

  /**
   * Get version history for a workflow template
   */
  async getVersionHistory(
    templateId: string,
    options: VersionListOptions = {}
  ): Promise<VersionWithContent[]> {
    try {
      const index = await this.loadVersionIndex(templateId);

      let versions = [...index.versions].reverse(); // Latest first

      // Apply pagination
      if (options.offset) {
        versions = versions.slice(options.offset);
      }
      if (options.limit) {
        versions = versions.slice(0, options.limit);
      }

      // Load content if requested
      if (options.includeContent) {
        const versionsWithContent: VersionWithContent[] = [];
        for (const version of versions) {
          const content = await this.loadVersion(templateId, version.version);
          versionsWithContent.push({
            ...version,
            content,
          });
        }
        return versionsWithContent;
      }

      return versions;
    } catch (error) {
      console.error(`Error getting version history for ${templateId}:`, error);
      return [];
    }
  }

  /**
   * Revert workflow to a specific version
   */
  async revertToVersion(
    templateId: string,
    targetVersion: number,
    options: VersioningOptions = {}
  ): Promise<VersioningResult> {
    try {
      console.log(
        `Reverting workflow ${templateId} to version ${targetVersion}`
      );

      // Load the target version
      const targetWorkflow = await this.loadVersion(templateId, targetVersion);
      if (!targetWorkflow) {
        return {
          success: false,
          errorMessage: `Version ${targetVersion} not found`,
        };
      }

      // Save as new version with revert summary
      const revertSummary =
        options.editSummary || `Reverted to version ${targetVersion}`;

      return await this.saveVersion(templateId, targetWorkflow, {
        ...options,
        editSummary: revertSummary,
        skipDuplicateCheck: true, // Allow reverting to identical content
      });
    } catch (error) {
      console.error(`Error reverting workflow ${templateId}:`, error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete a workflow and all its versions
   */
  async deleteWorkflow(
    templateId: string
  ): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      console.log(`Deleting all versions of workflow ${templateId}`);

      const index = await this.loadVersionIndex(templateId);

      // Delete all version files
      const deletePromises = index.versions.map((version) =>
        this.r2.delete(version.filePath)
      );

      // Delete index file
      deletePromises.push(this.r2.delete(this.getIndexPath(templateId)));

      await Promise.all(deletePromises);

      console.log(
        `Successfully deleted workflow ${templateId} and all ${index.versions.length} versions`
      );

      return { success: true };
    } catch (error) {
      console.error(`Error deleting workflow ${templateId}:`, error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get version index information
   */
  async getVersionIndex(
    templateId: string
  ): Promise<WorkflowVersionIndex | null> {
    try {
      return await this.loadVersionIndex(templateId);
    } catch (error) {
      console.error(`Error getting version index for ${templateId}:`, error);
      return null;
    }
  }

  /**
   * List all workflow templates with their current versions
   */
  async listWorkflows(
    prefix?: string
  ): Promise<
    Array<{ templateId: string; currentVersion: number; lastModified: string }>
  > {
    try {
      const listPrefix = prefix
        ? `${this.basePrefix}/${prefix}`
        : `${this.basePrefix}/`;

      const objects = await this.r2.list({ prefix: listPrefix });
      const workflows: Array<{
        templateId: string;
        currentVersion: number;
        lastModified: string;
      }> = [];

      // Filter for index files and extract workflow info
      for (const object of objects.objects) {
        if (object.key.endsWith("/index.json")) {
          const templateId = this.extractTemplateIdFromPath(object.key);
          if (templateId) {
            const index = await this.loadVersionIndex(templateId);
            workflows.push({
              templateId,
              currentVersion: index.currentVersion,
              lastModified: index.lastModified,
            });
          }
        }
      }

      return workflows.sort((a, b) =>
        b.lastModified.localeCompare(a.lastModified)
      );
    } catch (error) {
      console.error("Error listing workflows:", error);
      return [];
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Load version index from R2
   */
  private async loadVersionIndex(
    templateId: string
  ): Promise<WorkflowVersionIndex> {
    const indexPath = this.getIndexPath(templateId);
    const object = await this.r2.get(indexPath);

    if (!object) {
      return this.createNewIndex(templateId);
    }

    try {
      const content = await object.text();
      return JSON.parse(content) as WorkflowVersionIndex;
    } catch (error) {
      // SLC MVP: Log error and stop, don't try to recover
      console.error(
        `FATAL: Corrupted index for ${templateId}. Manual recovery required.`
      );
      throw new Error(`Corrupted workflow index: ${templateId}`);
    }
  }

  /**
   * Save version index to R2
   */
  private async saveVersionIndex(
    templateId: string,
    index: WorkflowVersionIndex
  ): Promise<void> {
    const indexPath = this.getIndexPath(templateId);
    const content = JSON.stringify(index, null, 2);

    await this.r2.put(indexPath, content, {
      httpMetadata: {
        contentType: "application/json",
      },
      customMetadata: {
        templateId,
        indexVersion: "1.0",
        lastUpdated: new Date().toISOString(),
      },
    });
  }

  /**
   * Create a new version index
   */
  private createNewIndex(templateId: string): WorkflowVersionIndex {
    const now = new Date().toISOString();
    return {
      templateId,
      currentVersion: 0,
      versions: [],
      createdAt: now,
      lastModified: now,
    };
  }

  /**
   * Generate file path for workflow version
   */
  private getWorkflowPath(templateId: string, version: number): string {
    return `${this.basePrefix}/${templateId}/v${version}.json`;
  }

  /**
   * Generate file path for version index
   */
  private getIndexPath(templateId: string): string {
    return `${this.basePrefix}/${templateId}/index.json`;
  }

  /**
   * Extract template ID from R2 object path
   */
  private extractTemplateIdFromPath(path: string): string | null {
    const match = path.match(/^workflows\/([^\/]+)\/index\.json$/);
    return match ? match[1] : null;
  }

  /**
   * Check if workflow content is duplicate of previous version
   */
  private async isDuplicateWorkflow(
    templateId: string,
    workflow: WorkflowTemplateV2,
    currentVersion: number
  ): Promise<boolean> {
    if (currentVersion === 0) return false;

    try {
      const currentWorkflow = await this.loadVersion(
        templateId,
        currentVersion
      );
      if (!currentWorkflow) return false;

      // Compare serialized content (excluding metadata timestamps)
      const normalizeForComparison = (w: WorkflowTemplateV2) => {
        const { metadata, ...rest } = w;
        const { last_modified, ...metaRest } = metadata;
        return { ...rest, metadata: metaRest };
      };

      const currentNormalized = JSON.stringify(
        normalizeForComparison(currentWorkflow)
      );
      const newNormalized = JSON.stringify(normalizeForComparison(workflow));

      return currentNormalized === newNormalized;
    } catch (error) {
      console.warn("Error checking for duplicate workflow:", error);
      return false;
    }
  }

  /**
   * Generate checksum for content integrity
   */
  private async generateChecksum(content: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a workflow versioning service instance
 */
export function createWorkflowVersioningService(
  r2: R2Bucket
): WorkflowVersioningService {
  return new WorkflowVersioningService(r2);
}

/**
 * Create versioning service with environment detection
 */
export function createVersioningServiceFromEnv(env: {
  WORKFLOW_VERSIONS?: R2Bucket;
}): WorkflowVersioningService | null {
  if (!env.WORKFLOW_VERSIONS) {
    console.error("WORKFLOW_VERSIONS R2 bucket not configured");
    return null;
  }

  return createWorkflowVersioningService(env.WORKFLOW_VERSIONS);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate version summary from workflow changes
 */
export function generateVersionSummary(
  oldWorkflow: WorkflowTemplateV2 | undefined,
  newWorkflow: WorkflowTemplateV2,
  toolCalls?: Array<{ tool: string; params: unknown }>
): string {
  if (!oldWorkflow) {
    return `Initial version: Created workflow "${newWorkflow.name}" with ${newWorkflow.goals.length} goals`;
  }

  if (toolCalls && toolCalls.length > 0) {
    // Generate summary from tool calls
    const actionSummary = toolCalls
      .map((call) => {
        const action = call.tool
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()
          .trim();
        return action;
      })
      .join(", ");

    return `Applied changes: ${actionSummary}`;
  }

  // Fallback: basic diff analysis
  const changes: string[] = [];

  if (oldWorkflow.name !== newWorkflow.name) {
    changes.push(`renamed from "${oldWorkflow.name}" to "${newWorkflow.name}"`);
  }

  if (oldWorkflow.goals.length !== newWorkflow.goals.length) {
    const diff = newWorkflow.goals.length - oldWorkflow.goals.length;
    changes.push(
      diff > 0 ? `added ${diff} goals` : `removed ${Math.abs(diff)} goals`
    );
  }

  // Count total elements
  const oldElements = oldWorkflow.goals.reduce(
    (total, g) =>
      total +
      g.constraints.length +
      g.policies.length +
      g.tasks.length +
      g.forms.length,
    0
  );
  const newElements = newWorkflow.goals.reduce(
    (total, g) =>
      total +
      g.constraints.length +
      g.policies.length +
      g.tasks.length +
      g.forms.length,
    0
  );

  if (oldElements !== newElements) {
    const diff = newElements - oldElements;
    changes.push(
      diff > 0 ? `added ${diff} elements` : `removed ${Math.abs(diff)} elements`
    );
  }

  return changes.length > 0
    ? `Updated workflow: ${changes.join(", ")}`
    : "Minor updates to workflow";
}

export default WorkflowVersioningService;
