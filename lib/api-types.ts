import { ProviderKey } from "./provider-config";

export interface GenerateImageRequest {
  prompt: string;
  provider: ProviderKey;
  modelId: string;
  count?: number; // Number of images to generate (default: 4)
}

export interface GenerateImageResponse {
  image?: string;
  error?: string;
}
