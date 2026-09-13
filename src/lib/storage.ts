import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Resizes and compresses an image in the browser before upload to save bandwidth and storage.
 */
export async function compressImage(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve) => {
    // If SVG or GIF, don't compress through canvas to preserve animation/vectors
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      resolve(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
      }

      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => resolve(file);
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file to Firebase Storage under the given folder path.
 * Returns the public CDN download URL.
 */
export async function uploadImage(
  file: File,
  folder: "players" | "teams" | "tournaments" | "uploads" = "uploads"
): Promise<string> {
  if (!file) throw new Error("No file selected.");
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files (PNG, JPG, WEBP) are allowed.");
  }

  // 1. Compress image before uploading
  const compressedBlob = await compressImage(file);

  // 2. Generate unique filename
  const cleanName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-")
    .replace(/-+/g, "-");
  const fileName = `${Date.now()}_${cleanName}`;
  const filePath = `${folder}/${fileName}`;

  // 3. Upload to Firebase Storage
  const storageRef = ref(storage, filePath);
  const snapshot = await uploadBytes(storageRef, compressedBlob, {
    contentType: "image/jpeg",
  });

  // 4. Retrieve permanent download URL
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}
