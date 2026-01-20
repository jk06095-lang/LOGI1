
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Compresses an image file.
 * Returns the compressed File object.
 */
export const compressImage = async (file: File): Promise<File> => {
  // If it's a PDF, we can't easily compress client-side without heavy libs, return as is.
  if (file.type === 'application/pdf') {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Scale down if too large (max 1600px width/height for efficiency)
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.65); // Compressed further (0.65) for better cloud savings
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
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
    const uniqueName = `${Date.now()}-${fileToUpload.name}`;
    const storageRef = ref(storage, `bl-documents/${dateFolder}/${uniqueName}`);

    await uploadBytes(storageRef, fileToUpload);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;

  } catch (error: any) {
    console.error("File upload error:", error);
    if (error.code === 'storage/unauthorized') {
      console.error("Storage Permission Denied. Please check if storage.rules are deployed.");
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
