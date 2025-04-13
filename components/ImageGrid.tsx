"use client";

import { ImageDisplay } from "./ImageDisplay";
import { ProviderKey } from "@/lib/provider-config";
import { ProviderTiming } from "@/lib/image-types";
import { ImageResult } from "@/lib/image-types";

interface ImageGridProps {
  images: ImageResult[];
  provider: ProviderKey;
  timing?: ProviderTiming;
  failed?: boolean;
  prompt?: string;
}

export function ImageGrid({
  images,
  provider,
  timing,
  failed,
  prompt,
}: ImageGridProps) {
  // Filter only images for this provider
  const providerImages = images.filter((img) => img.provider === provider);

  // Create a fixed array of slots
  const slots = [0, 1, 2, 3];

  return (
    <div className="grid grid-cols-4 gap-4">
      {slots.map((index) => {
        // Get the image for this slot if it exists
        const imageItem = providerImages.find((_, i) => i === index);

        // If no image exists for this slot, create a placeholder
        const displayItem = imageItem || {
          provider,
          image: null,
          modelId: "",
        };

        return (
          <ImageDisplay
            key={`${provider}-${index}`}
            provider={provider}
            image={displayItem.image}
            timing={timing}
            failed={failed}
            modelId={displayItem.modelId || ""}
            prompt={prompt}
          />
        );
      })}
    </div>
  );
}
