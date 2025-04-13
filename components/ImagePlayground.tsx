"use client";

import { useState } from "react";
import { PromptInput } from "@/components/PromptInput";
import { ImageGrid } from "@/components/ImageGrid";
import ImageLog from "@/components/ImageLog";
import {
  MODEL_CONFIGS,
  PROVIDER_ORDER,
  ProviderKey,
  ModelMode,
  initializeProviderRecord,
} from "@/lib/provider-config";
import { Suggestion } from "@/lib/suggestions";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { Header } from "./Header";

export function ImagePlayground({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  const {
    images,
    timings,
    failedProviders,
    isLoading,
    startGeneration,
    activePrompt,
  } = useImageGeneration();

  const [showProviders, setShowProviders] = useState(true);
  const [selectedModels, setSelectedModels] = useState<
    Record<ProviderKey, string>
  >(MODEL_CONFIGS.performance);
  const [enabledProviders] = useState(initializeProviderRecord(true));
  const [mode, setMode] = useState<ModelMode>("performance");
  const toggleView = () => {
    setShowProviders((prev) => !prev);
  };

  const handleModeChange = (newMode: ModelMode) => {
    setMode(newMode);
    setSelectedModels(MODEL_CONFIGS[newMode]);
    setShowProviders(true);
  };

  const providerToModel = {
    replicate: selectedModels.replicate,
  };

  const handlePromptSubmit = (newPrompt: string) => {
    const activeProviders = PROVIDER_ORDER.filter((p) => enabledProviders[p]);
    if (activeProviders.length > 0) {
      startGeneration(newPrompt, activeProviders, providerToModel);
    }
    setShowProviders(false);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        <PromptInput
          onSubmit={handlePromptSubmit}
          isLoading={isLoading}
          showProviders={showProviders}
          onToggleProviders={toggleView}
          mode={mode}
          onModeChange={handleModeChange}
          suggestions={suggestions}
        />
        <>
          {
            <div className="grid grid-cols-1 gap-8">
              {PROVIDER_ORDER.filter((p) => enabledProviders[p]).map(
                (provider) => (
                  <div key={provider} className="bg-zinc-50 p-6 rounded-lg">
                    <ImageGrid
                      images={images}
                      provider={provider}
                      timing={timings[provider]}
                      failed={failedProviders.includes(provider)}
                      prompt={activePrompt}
                    />
                  </div>
                )
              )}
            </div>
          }
          {activePrompt && activePrompt.length > 0 && (
            <div className="text-center mt-4 text-muted-foreground">
              {activePrompt}
            </div>
          )}

          {/* Image Log Component */}
          <ImageLog />
        </>
      </div>
    </div>
  );
}
