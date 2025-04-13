interface ImageLogEntry {
  url: string;
  name: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Upload an image to Firebase Storage via the API
 * @param file The file to upload
 * @param metadata Optional metadata to store with the image
 * @returns The API response including the download URL
 */
export const uploadImage = async (
  file: File,
  provider: string,
  prompt?: string
): Promise<ImageLogEntry> => {
  // Create form data
  const formData = new FormData();
  formData.append("file", file);
  formData.append("provider", provider);

  if (prompt) {
    formData.append("prompt", prompt);
  }

  // Upload the file using our API
  const response = await fetch("/api/images", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || "Failed to upload image");
  }

  const data = await response.json();

  return {
    url: data.url,
    name: data.name,
    timestamp: data.timestamp,
    metadata: data.metadata,
  };
};

/**
 * Get images from Firebase Storage and Firestore via the API
 * @param limit Maximum number of images to fetch
 * @param lastTimestamp Timestamp to use as starting point for pagination
 */
export const getImagesFromStorage = async (
  limit?: number,
  lastTimestamp?: number
): Promise<ImageLogEntry[]> => {
  try {
    let url = "/api/images";

    // Add query parameters for pagination
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (lastTimestamp) params.append("lastTimestamp", lastTimestamp.toString());

    // Append parameters to URL if any exist
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log(
      `Fetching images with: limit=${limit}, lastTimestamp=${lastTimestamp}, url=${url}`
    );

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`HTTP error ${response.status}: ${errorData}`);
      throw new Error(`Failed to fetch images: HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`Received ${data.length} images from API`);
    return data as ImageLogEntry[];
  } catch (error) {
    console.error("Failed to get images from Firebase:", error);
    throw error;
  }
};

/**
 * Save an image to Firestore via API
 */
export const logImage = async (entry: ImageLogEntry): Promise<void> => {
  try {
    const response = await fetch("/api/images/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || "Failed to log image");
    }
  } catch (error) {
    console.error("Failed to log image to Firestore:", error);
  }
};

/**
 * Get all logged images from Firestore via API
 * @param limit Maximum number of images to fetch
 * @param lastTimestamp Timestamp to use as starting point for pagination
 */
export const getImageLog = async (
  limit?: number,
  lastTimestamp?: number
): Promise<ImageLogEntry[]> => {
  try {
    let url = "/api/images/log";

    // Add query parameters for pagination
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (lastTimestamp) params.append("lastTimestamp", lastTimestamp.toString());

    // Append parameters to URL if any exist
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    console.log(
      `Fetching image log with: limit=${limit}, lastTimestamp=${lastTimestamp}, url=${url}`
    );

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`HTTP error ${response.status}: ${errorData}`);
      throw new Error(`Failed to fetch image log: HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`Received ${data.length} images from API log endpoint`);
    return data as ImageLogEntry[];
  } catch (error) {
    console.error("Failed to get image log from Firestore:", error);
    return [];
  }
};
