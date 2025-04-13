import { NextRequest, NextResponse } from "next/server";
import { storage, firestore } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";
import { Query } from "firebase-admin/firestore";

// Configurable values from environment variables
const bucketName = process.env.FIREBASE_STORAGE_BUCKET_NAME || "";
const imagesCollection = process.env.FIRESTORE_IMAGES_COLLECTION || "images";
const filePathPrefix =
  process.env.STORAGE_FILE_PATH_PREFIX || "generated-images/";
const publicUrlBase = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/`;

// Create a storage reference with explicit bucket name
const bucket = storage.bucket(bucketName);
console.log("Storage bucket reference created:", bucket.name);

// Firestore collection for image metadata
const IMAGES_COLLECTION = imagesCollection;

export async function POST(request: NextRequest) {
  console.log("📥 POST /api/images - Request received");
  try {
    const formData = await request.formData();
    console.log("Form data parsed successfully");

    const file = formData.get("file") as File;
    const prompt = (formData.get("prompt") as string) || "No prompt provided";
    const provider = (formData.get("provider") as string) || "unknown";

    console.log(
      `Image upload details: Provider=${provider}, Prompt length=${prompt.length}`
    );
    console.log(
      `File info: Name=${file?.name}, Size=${file?.size}, Type=${file?.type}`
    );

    if (!file) {
      console.error("No file provided in form data");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert the file to a buffer
    console.log("Converting file to buffer...");
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`Buffer created: ${buffer.length} bytes`);

    // Create a unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${uuidv4()}.png`;
    const filePath = `${filePathPrefix}${filename}`;
    console.log(`Generated filepath: ${filePath}`);

    // Create a file reference
    const fileRef = bucket.file(filePath);
    console.log("File reference created");

    // Set metadata
    const metadata = {
      contentType: "image/png",
      metadata: {
        prompt,
        provider,
        timestamp: timestamp.toString(),
        createdAt: new Date().toISOString(),
      },
    };
    console.log("Metadata prepared:", JSON.stringify(metadata));

    try {
      // Upload the file
      console.log("Starting file upload to Firebase...");
      await fileRef.save(buffer, {
        metadata,
      });
      console.log("✅ File uploaded successfully");

      // Make the file publicly accessible
      console.log("Setting file to be publicly accessible...");
      await fileRef.makePublic();
      console.log("✅ File made public");
    } catch (uploadError) {
      console.error("Firebase Storage upload error:", uploadError);
      console.error("Error details:", JSON.stringify(uploadError, null, 2));
      throw uploadError; // Re-throw to be caught by outer try-catch
    }

    // Get the public URL
    const publicUrl = `${publicUrlBase}${encodeURIComponent(
      filePath
    )}?alt=media`;
    console.log("Generated public URL:", publicUrl);

    // Prepare image data for response and Firestore
    const imageData = {
      url: publicUrl,
      name: filename,
      timestamp,
      metadata: {
        prompt,
        provider,
        timestamp,
        createdAt: new Date().toISOString(),
      },
    };

    // Store metadata in Firestore
    console.log("Storing metadata in Firestore...");
    try {
      await firestore.collection(IMAGES_COLLECTION).add(imageData);
      console.log("✅ Metadata stored in Firestore");
    } catch (firestoreError) {
      console.error("Firestore storage error:", firestoreError);
      // Don't fail the whole request if Firestore fails
      console.log("Continuing despite Firestore error");
    }

    console.log("✅ Upload complete, returning success response");
    return NextResponse.json(imageData);
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    console.error("Error stack:", (error as Error).stack);

    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, message: ${error.message}`);
    }

    // Log all properties of the error object
    console.error(
      "Full error object:",
      JSON.stringify(
        Object.getOwnPropertyNames(error).reduce((acc, prop) => {
          acc[prop] = (error as Record<string, unknown>)[prop];
          return acc;
        }, {} as Record<string, unknown>),
        null,
        2
      )
    );

    return NextResponse.json(
      {
        error: "Failed to upload image",
        details: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log("📥 GET /api/images - Request received");
  try {
    // Get pagination parameters from URL
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;
    const lastTimestamp = searchParams.get("lastTimestamp")
      ? parseInt(searchParams.get("lastTimestamp")!)
      : undefined;

    console.log(
      `Pagination params: limit=${limit}, lastTimestamp=${lastTimestamp}`
    );

    // Get data from both Storage and Firestore
    console.log("Fetching data from Storage and Firestore...");

    // Get files from Storage
    console.log("Attempting to list files from bucket:", bucket.name);
    const [files] = await bucket.getFiles({
      prefix: filePathPrefix,
      // If possible, limit the number of files retrieved from storage
      maxResults: limit ? limit * 2 : undefined, // Get more than needed to account for filtering
    });
    console.log(`Found ${files.length} files in storage`);

    if (files.length === 0) {
      console.log("No files found in the bucket");
    }

    // Get the metadata and URLs for each file from Storage
    console.log("Retrieving metadata for files from Storage...");
    const storageData = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          name: file.name,
          url: `${publicUrlBase}${encodeURIComponent(file.name)}?alt=media`,
          timestamp: Number(metadata.metadata?.timestamp || Date.now()),
          metadata: metadata.metadata || {},
        };
      })
    );

    // Get metadata from Firestore with proper query construction
    console.log("Retrieving data from Firestore...");

    // Create a properly typed query
    const collectionRef = firestore.collection(IMAGES_COLLECTION);
    let query = collectionRef.orderBy("timestamp", "desc") as Query;

    // Use cursor-based pagination
    if (lastTimestamp) {
      query = query.startAfter(lastTimestamp);
    }

    // If we have a limit, apply it to the query
    if (limit) {
      query = query.limit(limit);
    }

    const firestoreSnapshot = await query.get();
    const firestoreData = firestoreSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        name: data.name || "",
        url: data.url || "",
        timestamp: Number(data.timestamp) || Date.now(),
        metadata: data.metadata || {},
      };
    });
    console.log(`Found ${firestoreData.length} documents in Firestore query`);

    // Combine data from both sources
    console.log("Combining data from both sources...");
    let combinedData = [...firestoreData];

    // Filter storage data by timestamp if needed
    let filteredStorageData = storageData;
    if (lastTimestamp) {
      filteredStorageData = storageData.filter(
        (item) => item.timestamp < lastTimestamp
      );
    }

    // Add Storage records that aren't already in the combined list
    filteredStorageData.forEach((storageItem) => {
      if (
        !combinedData.some(
          (item) =>
            item.timestamp === storageItem.timestamp &&
            item.url === storageItem.url
        )
      ) {
        combinedData.push(storageItem);
      }
    });

    // Sort by timestamp (newest first)
    combinedData.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit if it exists
    if (limit && limit > 0 && combinedData.length > limit) {
      combinedData = combinedData.slice(0, limit);
    }

    console.log(`✅ Returning ${combinedData.length} files after pagination`);

    return NextResponse.json(combinedData);
  } catch (error) {
    console.error("❌ Error fetching images:", error);
    console.error("Error stack:", (error as Error).stack);

    return NextResponse.json(
      {
        error: "Failed to fetch images",
        details: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 }
    );
  }
}
