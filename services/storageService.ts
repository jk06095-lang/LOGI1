
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import imageCompression from "https://esm.sh/browser-image-compression@2.0.2";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Compresses an image file using browser-image-compression.
 * Efficiently handles memory and EXIF rotation.
 */
export const compressImage = async (file: File): Promise<File> => {
  // If it's a PDF or non-image, return as is.
  if (file.type === 'application/pdf' || !file.type.startsWith('image/')) {
    return file;
  }

  const options = {
    maxSizeMB: 1,          // Compress to ~1MB
    maxWidthOrHeight: 1920, // Limit resolution to FHD (Prevents OOM on mobile)
    useWebWorker: true,    // Use separate thread
    fileType: 'image/jpeg', // Force convert to JPEG
    initialQuality: 0.7,   // Good balance
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // console.log(`Compression: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    return compressedFile;
  } catch (error) {
    console.error("Image compression failed, using original:", error);
    return file;
  }
};

/**
 * Uploads a file to Firebase Storage (with compression and size limit)
 */
export const uploadFileToStorage = async (file: File): Promise<string> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum allowed size is 20MB. (Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
  }

  if (!storage) {
    console.warn("Storage not initialized, skipping upload");
    return "";
  }

  try {
    const fileToUpload = await compressImage(file);
    
    const dateFolder = new Date().toISOString().split('T')[0];
    const uniqueName = `${Date.now()}-${fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; // Sanitize filename
    const storageRef = ref(storage, `bl-documents/${dateFolder}/${uniqueName}`);

    await uploadBytes(storageRef, fileToUpload);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;

  } catch (error: any) {
    console.error("File upload error:", error);
    if (error.code === 'storage/unauthorized') {
      console.error("Storage Permission Denied. Please check if your account is authorized.");
    }
    throw error;
  }
};

/**
 * Deletes a file from Firebase Storage using its download URL.
 * Fails silently if object not found to prevent flow interruption.
 */
export const deleteFileFromStorage = async (downloadUrl: string): Promise<void> => {
  if (!storage || !downloadUrl) return;

  try {
    // Create a reference from the full URL
    const fileRef = ref(storage, downloadUrl);
    await deleteObject(fileRef);
    console.log(`Deleted file: ${downloadUrl}`);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`File not found (already deleted?): ${downloadUrl}`);
    } else {
      console.error("Error deleting file:", error);
    }
  }
};
