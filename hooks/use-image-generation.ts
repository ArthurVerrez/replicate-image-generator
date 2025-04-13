import { useState, useEffect } from "react";
import { ImageError, ImageResult, ProviderTiming } from "@/lib/image-types";
import {
  initializeProviderRecord,
  ProviderKey,
  PROVIDER_ORDER,
} from "@/lib/provider-config";
import { imageHelpers } from "@/lib/image-helpers";
import { eventEmitter, EVENT_TYPES } from "@/lib/events";

// Helper to create initial placeholder images for all providers
const createInitialImages = (providerToModel?: Record<ProviderKey, string>) => {
  return PROVIDER_ORDER.flatMap((provider) =>
    Array(4)
      .fill(0)
      .map(() => ({
        provider,
        image: null,
        modelId: providerToModel?.[provider] || "",
      }))
  );
};

interface UseImageGenerationReturn {
  images: ImageResult[];
  errors: ImageError[];
  timings: Record<ProviderKey, ProviderTiming>;
  failedProviders: ProviderKey[];
  isLoading: boolean;
  startGeneration: (
    prompt: string,
    providers: ProviderKey[],
    providerToModel: Record<ProviderKey, string>
  ) => Promise<void>;
  resetState: () => void;
  activePrompt: string;
}

export function useImageGeneration(): UseImageGenerationReturn {
  // Initialize with placeholder images for all providers
  const [images, setImages] = useState<ImageResult[]>(createInitialImages());
  const [errors, setErrors] = useState<ImageError[]>([]);
  const [timings, setTimings] = useState<Record<ProviderKey, ProviderTiming>>(
    initializeProviderRecord<ProviderTiming>()
  );
  const [failedProviders, setFailedProviders] = useState<ProviderKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activePrompt, setActivePrompt] = useState("");

  const resetState = () => {
    // Reset to placeholder images instead of empty array
    setImages(createInitialImages());
    setErrors([]);
    setTimings(initializeProviderRecord<ProviderTiming>());
    setFailedProviders([]);
    setIsLoading(false);
  };

  const startGeneration = async (
    prompt: string,
    providers: ProviderKey[],
    providerToModel: Record<ProviderKey, string>
  ) => {
    setActivePrompt(prompt);
    try {
      setIsLoading(true);

      // Generate placeholder images for the selected providers
      const newProviderImages = providers.flatMap((provider) =>
        Array(4)
          .fill(0)
          .map(() => ({
            provider,
            image: null,
            modelId: providerToModel[provider],
          }))
      );

      // Keep existing images for providers not being updated
      setImages((prevImages) => {
        const nonSelectedProviderImages = prevImages.filter(
          (img) => !providers.includes(img.provider)
        );
        return [...nonSelectedProviderImages, ...newProviderImages];
      });

      // Clear previous state
      setErrors([]);
      setFailedProviders([]);

      // Initialize timings with start times
      const now = Date.now();
      setTimings(
        Object.fromEntries(
          providers.map((provider) => [provider, { startTime: now }])
        ) as Record<ProviderKey, ProviderTiming>
      );

      // Helper to fetch multiple images for a single provider
      const generateImages = async (provider: ProviderKey, modelId: string) => {
        const startTime = now;
        console.log(
          `Generate multiple images request [provider=${provider}, modelId=${modelId}]`
        );
        try {
          const request = {
            prompt,
            provider,
            modelId,
            count: 4, // Generate 4 images
          };

          const response = await fetch("/api/generate-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || `Server error: ${response.status}`);
          }

          const completionTime = Date.now();
          const elapsed = completionTime - startTime;
          setTimings((prev) => ({
            ...prev,
            [provider]: {
              startTime,
              completionTime,
              elapsed,
            },
          }));

          console.log(
            `Successful multiple images response [provider=${provider}, modelId=${modelId}, elapsed=${elapsed}ms]`
          );

          // Update images in state
          if (Array.isArray(data.images) && data.images.length > 0) {
            const newImages = data.images.map((imageBase64: string) => ({
              provider,
              image: imageBase64,
              modelId,
            }));

            // Automatically upload images to Firebase
            try {
              await Promise.all(
                newImages.map(async (img: ImageResult) => {
                  if (img.image) {
                    try {
                      await imageHelpers.shareOrDownload(
                        img.image,
                        provider,
                        prompt,
                        true
                      );
                      console.log(
                        `Auto-uploaded image from ${provider} to Firebase`
                      );
                      // Emit event that an image was uploaded
                      eventEmitter.emit(EVENT_TYPES.IMAGE_UPLOADED, {
                        provider,
                        prompt,
                      });
                    } catch (uploadError) {
                      console.error(
                        `Error auto-uploading image from ${provider}:`,
                        uploadError
                      );
                      throw uploadError;
                    }
                  }
                })
              );
              console.log(
                `All ${newImages.length} images from ${provider} uploaded successfully`
              );
              // Emit event that all images for this provider are generated and uploaded
              eventEmitter.emit(EVENT_TYPES.IMAGE_GENERATED, {
                provider,
                count: newImages.length,
                prompt,
              });
            } catch (batchUploadError) {
              console.error(
                `Error batch-uploading images from ${provider}:`,
                batchUploadError
              );
            }

            setImages((prevImages) => {
              const nonProviderImages = prevImages.filter(
                (item) => item.provider !== provider
              );
              return [...nonProviderImages, ...newImages];
            });
          } else {
            throw new Error("No images returned from the API");
          }
        } catch (err) {
          console.error(
            `Error [provider=${provider}, modelId=${modelId}]:`,
            err
          );
          setFailedProviders((prev) => [...prev, provider]);
          setErrors((prev) => [
            ...prev,
            {
              provider,
              message:
                err instanceof Error
                  ? err.message
                  : "An unexpected error occurred",
            },
          ]);

          // Mark all images for this provider as failed
          setImages((prevImages) =>
            prevImages.map((item) =>
              item.provider === provider
                ? { ...item, image: null, modelId }
                : item
            )
          );
        }
      };

      // Generate images for all active providers
      const fetchPromises = providers.map((provider) => {
        const modelId = providerToModel[provider];
        return generateImages(provider, modelId);
      });

      await Promise.all(fetchPromises);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    images,
    errors,
    timings,
    failedProviders,
    isLoading,
    startGeneration,
    resetState,
    activePrompt,
  };
}
