import { NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/firebase-admin";
import { Query } from "firebase-admin/firestore";

// Firestore collection for image metadata
const IMAGES_COLLECTION = "images";

/**
 * POST /api/images/log
 * Add an image entry to the Firestore log
 */
export async function POST(request: NextRequest) {
  console.log("📥 POST /api/images/log - Request received");
  try {
    const data = await request.json();

    // Validate the required fields
    if (!data.url || !data.name || !data.timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Add the document to Firestore using Admin SDK (bypasses security rules)
    const docRef = await firestore.collection(IMAGES_COLLECTION).add(data);
    console.log(`✅ Document written with ID: ${docRef.id}`);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("❌ Error adding image to log:", error);

    return NextResponse.json(
      {
        error: "Failed to add image to log",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/images/log
 * Get all images from the Firestore log
 */
export async function GET(request: NextRequest) {
  console.log("📥 GET /api/images/log - Request received");
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

    // Create a properly typed query
    const collectionRef = firestore.collection(IMAGES_COLLECTION);
    let query = collectionRef.orderBy("timestamp", "desc") as Query;

    // Use cursor-based pagination
    if (lastTimestamp) {
      query = query.startAfter(lastTimestamp);
    }

    // Apply limit if provided
    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();

    // Format the response
    const images = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(
      `✅ Retrieved ${images.length} images from Firestore (out of total collection)`
    );
    return NextResponse.json(images);
  } catch (error) {
    console.error("❌ Error fetching images from log:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch images from log",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/log
 * Clear all images from the Firestore log
 */
export async function DELETE() {
  console.log("📥 DELETE /api/images/log - Request received");
  try {
    // Get all documents in the collection
    const snapshot = await firestore.collection(IMAGES_COLLECTION).get();

    // Delete each document in batches of 500 (Firestore limit)
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = firestore.batch();
      const docs = snapshot.docs.slice(i, i + batchSize);

      docs.forEach((doc) => batch.delete(doc.ref));
      batches.push(batch.commit());
    }

    await Promise.all(batches);

    console.log(`✅ Deleted ${snapshot.docs.length} images from Firestore`);
    return NextResponse.json({ success: true, count: snapshot.docs.length });
  } catch (error) {
    console.error("❌ Error clearing images from log:", error);

    return NextResponse.json(
      {
        error: "Failed to clear images from log",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
