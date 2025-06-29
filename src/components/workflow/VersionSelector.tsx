import { Button } from "@/components/button/Button";
import { Loader } from "@/components/loader/Loader";
import type { WorkflowTemplateV2 } from "@/types/workflow-v2";
import {
  ArrowCounterClockwise,
  Check,
  Clock,
  GitBranch,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export interface WorkflowVersion {
  version: number;
  templateId: string;
  createdAt: string;
  createdBy: string;
  editSummary: string;
  filePath: string;
  fileSize?: number;
  checksum?: string;
}

interface VersionsResponse {
  versions: WorkflowVersion[];
}

interface RevertResponse {
  success: boolean;
  newVersion: number;
  updatedWorkflow?: WorkflowTemplateV2;
  message?: string;
}

export interface VersionSelectorProps {
  workflow?: WorkflowTemplateV2 | null;
  currentVersion?: number;
  onVersionChange?: (version: number, workflow: WorkflowTemplateV2) => void;
  className?: string;
}

export function VersionSelector({
  workflow,
  currentVersion,
  onVersionChange,
  className = "",
}: VersionSelectorProps) {
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Load version history when workflow changes
  useEffect(() => {
    if (!workflow?.id) {
      setVersions([]);
      return;
    }

    loadVersions(workflow.id);
  }, [workflow?.id]);

  // Update selected version when current version changes
  useEffect(() => {
    if (currentVersion !== undefined) {
      setSelectedVersion(currentVersion);
    }
  }, [currentVersion]);

  const loadVersions = async (workflowId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workflow/${workflowId}/versions`);

      if (response.ok) {
        const data: VersionsResponse = await response.json();
        setVersions(data.versions || []);
      } else {
        console.error("Failed to load versions:", response.statusText);
        setVersions([]);
      }
    } catch (error) {
      console.error("Error loading versions:", error);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (version: number) => {
    setSelectedVersion(version);
  };

  const handleRevertToVersion = async () => {
    if (
      !workflow?.id ||
      selectedVersion === null ||
      selectedVersion === currentVersion
    ) {
      return;
    }

    try {
      setReverting(true);

      // Revert to selected version
      const revertResponse = await fetch(
        `/api/workflow/${workflow.id}/revert/${selectedVersion}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            editSummary: `Reverted to version ${selectedVersion}`,
          }),
        }
      );

      if (revertResponse.ok) {
        const revertResult: RevertResponse = await revertResponse.json();

        if (revertResult.success && revertResult.updatedWorkflow) {
          // Call the parent handler with the reverted workflow
          onVersionChange?.(
            revertResult.newVersion,
            revertResult.updatedWorkflow
          );

          // Reload versions to show the new revert version
          await loadVersions(workflow.id);
        } else {
          console.error("Revert failed:", revertResult.message);
        }
      } else {
        console.error("Revert request failed:", revertResponse.statusText);
      }
    } catch (error) {
      console.error("Error reverting version:", error);
    } finally {
      setReverting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getVersionLabel = (version: WorkflowVersion) => {
    const isCurrentVersion = version.version === currentVersion;
    const prefix = isCurrentVersion ? "★ " : "";
    return `${prefix}v${version.version} - ${version.editSummary}`;
  };

  if (!workflow) {
    return null;
  }

  return (
    <div
      className={`bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <GitBranch
          size={16}
          className="text-neutral-600 dark:text-neutral-400"
        />
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Version History
        </h3>
        {loading && <Loader size={16} />}
      </div>

      {versions.length === 0 && !loading ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No version history available
        </p>
      ) : (
        <div className="space-y-3">
          {/* Version Selection */}
          <div>
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">
              Select Version
            </label>
            <select
              value={selectedVersion?.toString() || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value && value !== "") {
                  handleVersionSelect(Number.parseInt(value, 10));
                }
              }}
              disabled={loading || reverting}
              className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                Select version...
              </option>
              {versions.map((version) => (
                <option
                  key={version.version}
                  value={version.version.toString()}
                >
                  {getVersionLabel(version)}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Version Details */}
          {selectedVersion !== null && (
            <div className="bg-neutral-50 dark:bg-neutral-700 rounded-md p-3">
              {(() => {
                const version = versions.find(
                  (v) => v.version === selectedVersion
                );
                if (!version) return null;

                const isCurrentVersion = version.version === currentVersion;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Version {version.version}
                        </span>
                        {isCurrentVersion && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            <Check size={12} />
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <Clock size={12} />
                        {formatDate(version.createdAt)}
                      </div>
                    </div>

                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      {version.editSummary}
                    </p>

                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span>by {version.createdBy}</span>
                      {version.fileSize && (
                        <span>{(version.fileSize / 1024).toFixed(1)} KB</span>
                      )}
                    </div>

                    {/* Revert Button */}
                    {!isCurrentVersion && (
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-600">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleRevertToVersion}
                          disabled={reverting}
                          className="w-full"
                        >
                          {reverting ? (
                            <>
                              <Loader size={12} className="mr-2" />
                              Reverting...
                            </>
                          ) : (
                            <>
                              <ArrowCounterClockwise
                                size={14}
                                className="mr-2"
                              />
                              Revert to This Version
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Version List Summary */}
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {versions.length} version{versions.length !== 1 ? "s" : ""}{" "}
            available
          </div>
        </div>
      )}
    </div>
  );
}
