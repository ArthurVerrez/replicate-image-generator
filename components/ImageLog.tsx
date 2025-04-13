import { useState, useEffect, useCallback } from "react";
import { getImageLog, getImagesFromStorage } from "@/lib/storage-helpers";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { Download, Share, RefreshCcw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { eventEmitter, EVENT_TYPES } from "@/lib/events";

interface ImageLogEntry {
  url: string;
  name: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Number of images to load per batch
const BATCH_SIZE = 12;

export default function ImageLog() {
  const [images, setImages] = useState<ImageLogEntry[]>([]);
  const [isOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<ImageLogEntry | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [hasMoreImages, setHasMoreImages] = useState<boolean>(true);
  const [lastImageTimestamp, setLastImageTimestamp] = useState<
    number | undefined
  >(undefined);

  // Memoize fetchImages to avoid recreation on each render
  const fetchImages = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Use the API to get images with pagination - just BATCH_SIZE items
      const imagesList = await getImagesFromStorage(BATCH_SIZE);

      if (imagesList.length === 0) {
        setHasMoreImages(false);
      } else {
        // If we got fewer images than requested, there are no more to load
        setHasMoreImages(imagesList.length === BATCH_SIZE);
        // Save the timestamp of the last image for pagination
        const lastImage = imagesList[imagesList.length - 1];
        setLastImageTimestamp(lastImage?.timestamp);
      }

      setImages(imagesList);
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error("Error fetching images:", error);
      setError("Failed to load images. Please try again.");

      // Try fallback to just Firestore data
      try {
        const firestoreImages = await getImageLog(BATCH_SIZE);
        if (firestoreImages.length === 0) {
          setHasMoreImages(false);
        } else {
          setHasMoreImages(firestoreImages.length === BATCH_SIZE);
          const lastImage = firestoreImages[firestoreImages.length - 1];
          setLastImageTimestamp(lastImage?.timestamp);
        }

        setImages(firestoreImages);
        setLastRefreshTime(Date.now());
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  // Function to load more images
  const loadMoreImages = useCallback(async () => {
    if (!hasMoreImages || isLoading || !lastImageTimestamp) return;

    setIsLoading(true);

    try {
      // Fetch the next batch using the last timestamp as a cursor
      const moreImages = await getImagesFromStorage(
        BATCH_SIZE,
        lastImageTimestamp
      );

      if (moreImages.length === 0) {
        setHasMoreImages(false);
      } else {
        // If we got fewer images than requested, there are no more to load
        setHasMoreImages(moreImages.length === BATCH_SIZE);

        // Update the last image timestamp for next pagination
        const lastImage = moreImages[moreImages.length - 1];
        setLastImageTimestamp(lastImage?.timestamp);

        // Append new images to the existing ones
        setImages((prevImages) => [...prevImages, ...moreImages]);
      }
    } catch (error) {
      console.error("Error loading more images:", error);
      setError("Failed to load more images. Please try again.");

      // Try fallback
      try {
        const moreFirestoreImages = await getImageLog(
          BATCH_SIZE,
          lastImageTimestamp
        );

        if (moreFirestoreImages.length === 0) {
          setHasMoreImages(false);
        } else {
          setHasMoreImages(moreFirestoreImages.length === BATCH_SIZE);
          const lastImage = moreFirestoreImages[moreFirestoreImages.length - 1];
          setLastImageTimestamp(lastImage?.timestamp);

          setImages((prevImages) => [...prevImages, ...moreFirestoreImages]);
        }
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [hasMoreImages, isLoading, lastImageTimestamp]);

  // Fetch images on component mount
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Also fetch images when the component is opened
  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen, fetchImages]);

  // Listen for image generation/upload events
  useEffect(() => {
    // When images are generated or uploaded, refresh the image list
    const unsubscribeGenerated = eventEmitter.on(
      EVENT_TYPES.IMAGE_GENERATED,
      () => {
        console.log("Refreshing image list after generation");
        // Reset pagination state
        setLastImageTimestamp(undefined);
        setHasMoreImages(true);
        // Direct fetch without timeout
        fetchImages(true);
      }
    );

    const unsubscribeUploaded = eventEmitter.on(
      EVENT_TYPES.IMAGE_UPLOADED,
      () => {
        console.log("Refreshing image list after upload");
        // Reset pagination state
        setLastImageTimestamp(undefined);
        setHasMoreImages(true);
        // Direct fetch without timeout
        fetchImages(true);
      }
    );

    // Clean up event listeners
    return () => {
      unsubscribeGenerated();
      unsubscribeUploaded();
    };
  }, [fetchImages]);

  // Add event handlers for zoomed image
  useEffect(() => {
    if (zoomedImage) {
      window.history.pushState({ zoomed: true }, "");
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && zoomedImage) {
        setZoomedImage(null);
      }
    };

    const handlePopState = () => {
      if (zoomedImage) {
        setZoomedImage(null);
      }
    };

    if (zoomedImage) {
      document.addEventListener("keydown", handleEscape);
      window.addEventListener("popstate", handlePopState);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [zoomedImage]);

  const handleRefreshClick = () => {
    setIsLoading(true);
    // Reset pagination state
    setLastImageTimestamp(undefined);
    setHasMoreImages(true);
    fetchImages(true);
  };

  const handleImageClick = (e: React.MouseEvent, entry: ImageLogEntry) => {
    e.stopPropagation();
    setZoomedImage(entry);
  };

  // Loading state as overlay when images exist
  const renderLoadingOverlay = () => {
    if (!isLoading) return null;

    return (
      <div className="absolute inset-0 bg-slate-800/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <div className="flex items-center justify-center space-x-2 bg-slate-900/80 px-4 py-2 rounded-lg">
          <RefreshCcw className="h-5 w-5 animate-spin text-white" />
          <p className="text-white">Refreshing...</p>
        </div>
      </div>
    );
  };

  // Show loading only if we have no images yet
  if (isLoading && images.length === 0) {
    return (
      <>
        <div className="w-full h-px bg-zinc-200 dark:bg-slate-700 my-4"></div>
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-slate-800 mt-4">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCcw className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
            <p className="text-slate-500 dark:text-slate-400">
              Loading images...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="w-full h-px bg-zinc-200 dark:bg-slate-700 my-4"></div>
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-slate-800 mt-4">
          <p className="text-red-500">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </>
    );
  }

  if (images.length === 0) {
    return (
      <>
        <div className="w-full h-px bg-zinc-200 dark:bg-slate-700 my-4"></div>
        <div className="p-4 rounded-lg bg-zinc-50 dark:bg-slate-800 mt-4">
          <p className="text-slate-500 dark:text-slate-400">
            No images saved yet.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="w-full h-px bg-zinc-200 dark:bg-slate-700 my-4"></div>
      <div className="p-4 rounded-lg bg-zinc-50 dark:bg-slate-800 mt-4 relative">
        {renderLoadingOverlay()}
        <div className="flex justify-between items-center mb-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Last updated: {new Date(lastRefreshTime).toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            className="flex items-center gap-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCcw className="h-3.5 w-3.5" />
                Refresh
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${entry.name || index}`}
              className="relative group"
            >
              <div
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-lg bg-background cursor-pointer"
                )}
                onClick={(e) => handleImageClick(e, entry)}
              >
                <img
                  src={entry.url}
                  alt={entry.name || "Generated image"}
                  className="w-full h-full object-cover rounded-lg"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-2 left-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Open in new tab
                    window.open(entry.url, "_blank");
                  }}
                >
                  <span className="sm:hidden">
                    <Share className="h-4 w-4" />
                  </span>
                  <span className="hidden sm:block">
                    <Download className="h-4 w-4" />
                  </span>
                </Button>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-white text-xs">
                  <p className="truncate">
                    {entry.metadata && typeof entry.metadata.prompt === "string"
                      ? entry.metadata.prompt.substring(0, 30)
                      : "No prompt"}
                  </p>
                  <p className="truncate">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More button */}
        {hasMoreImages && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={loadMoreImages}
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4" />
              Load More
            </Button>
          </div>
        )}
      </div>

      {zoomedImage &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-pointer min-h-[100dvh] w-screen"
            onClick={() => setZoomedImage(null)}
          >
            <div className="relative flex items-center justify-center w-[90vw] h-[90dvh]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-zinc-300/20 border-t-zinc-300/80 rounded-full animate-spin"></div>
              </div>
              <img
                src={zoomedImage.url}
                alt={zoomedImage.name || "Generated image"}
                className="max-h-[90dvh] max-w-[90vw] object-contain relative"
                onClick={(e) => e.stopPropagation()}
                style={{ opacity: 1 }}
                onLoad={(e) => {
                  // Once loaded, hide the spinner by targeting its parent
                  const target = e.currentTarget;
                  const spinner = target.previousElementSibling;
                  if (spinner) {
                    spinner.classList.add("opacity-0");
                  }
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-3 text-white">
                <p className="text-sm break-words">
                  {typeof zoomedImage.metadata?.prompt === "string"
                    ? zoomedImage.metadata.prompt
                    : "No prompt"}
                </p>
                <p className="text-xs text-white/70 mt-1">
                  {new Date(zoomedImage.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
