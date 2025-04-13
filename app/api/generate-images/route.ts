import { NextRequest, NextResponse } from "next/server";
import { ImageModel, experimental_generateImage as generateImage } from "ai";
import { replicate } from "@ai-sdk/replicate";
import { ProviderKey } from "@/lib/provider-config";
import { GenerateImageRequest } from "@/lib/api-types";

/**
 * Intended to be slightly less than the maximum execution time allowed by the
 * runtime so that we can gracefully terminate our request.
 */
const TIMEOUT_MILLIS = 55 * 1000;

const DEFAULT_IMAGE_SIZE = "1024x1024";
const DEFAULT_ASPECT_RATIO = "1:1";

interface ProviderConfig {
  createImageModel: (modelId: string) => ImageModel;
  dimensionFormat: "size" | "aspectRatio";
}

const providerConfig: Record<ProviderKey, ProviderConfig> = {
  replicate: {
    createImageModel: replicate.image,
    dimensionFormat: "size",
  },
};

const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMillis: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutMillis)
    ),
  ]);
};

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const {
    prompt,
    provider,
    modelId,
    count = 4,
  } = (await req.json()) as GenerateImageRequest & { count?: number };

  try {
    if (!prompt || !provider || !modelId || !providerConfig[provider]) {
      const error = "Invalid request parameters";
      console.error(`${error} [requestId=${requestId}]`);
      return NextResponse.json({ error }, { status: 400 });
    }

    const config = providerConfig[provider];
    const startstamp = performance.now();

    // Generate multiple images at once
    const generatePromises = Array(count)
      .fill(0)
      .map(() =>
        generateImage({
          model: config.createImageModel(modelId),
          prompt,
          ...(config.dimensionFormat === "size"
            ? { size: DEFAULT_IMAGE_SIZE }
            : { aspectRatio: DEFAULT_ASPECT_RATIO }),
          providerOptions: {},
        }).then(({ image, warnings }) => {
          if (warnings?.length > 0) {
            console.warn(
              `Warnings [requestId=${requestId}, provider=${provider}, model=${modelId}]: `,
              warnings
            );
          }
          return image.base64;
        })
      );

    const images = await withTimeout(
      Promise.all(generatePromises),
      TIMEOUT_MILLIS
    );

    console.log(
      `Completed multiple image request [requestId=${requestId}, provider=${provider}, model=${modelId}, count=${count}, elapsed=${(
        (performance.now() - startstamp) /
        1000
      ).toFixed(1)}s].`
    );

    return NextResponse.json(
      {
        provider,
        images,
      },
      { status: 200 }
    );
  } catch (error) {
    // Log full error detail on the server, but return a generic error message
    // to avoid leaking any sensitive information to the client.
    console.error(
      `Error generating images [requestId=${requestId}, provider=${provider}, model=${modelId}]: `,
      error
    );
    return NextResponse.json(
      {
        error: "Failed to generate images. Please try again later.",
      },
      { status: 500 }
    );
  }
}
