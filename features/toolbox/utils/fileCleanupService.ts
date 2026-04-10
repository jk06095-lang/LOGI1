import { ref, listAll, deleteObject, getStorage } from 'firebase/storage';
import { collection, getDocs } from 'firebase/firestore';
import { db, storage } from '../../../lib/firebase';

const UPLOAD_PATH = 'toolbox_uploads/';

/**
 * Extracts Firebase Storage URLs from HTML content.
 * Looks for <img src="..."> and <a href="..."> tags.
 */
export const extractStorageUrls = (htmlContent: string): string[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const urls: string[] = [];

    // Extract from images
    doc.querySelectorAll('img').forEach(img => {
        if (img.src.includes('firebasestorage.googleapis.com')) {
            urls.push(img.src);
        }
    });

    // Extract from links (attachments)
    doc.querySelectorAll('a').forEach(a => {
        if (a.href.includes('firebasestorage.googleapis.com')) {
            urls.push(a.href);
        }
    });

    return urls;
};

/**
 * Deletes a list of files from Firebase Storage by their download URLs.
 */
export const deleteFiles = async (urls: string[]) => {
    if (!urls.length) return;

    const deletePromises = urls.map(async (url) => {
        try {
            // Convert download URL to Storage Reference
            // URL format: https://firebasestorage.googleapis.com/v0/b/[BUCKET]/o/[PATH]?token=...
            // decodeURIComponent is needed because path is encoded
            const baseUrl = "https://firebasestorage.googleapis.com/v0/b/";
            if (!url.startsWith(baseUrl)) return;

            let pathPart = url.replace(baseUrl, "");
            const indexOfQuery = pathPart.indexOf("?");
            if (indexOfQuery >= 0) pathPart = pathPart.substring(0, indexOfQuery);

            // The path part might contain the bucket name at the beginning, but the SDK refFromURL usually handles full URLs.
            // However, refFromURL is easier. Let's try to use ref from url if possible, or parse manually.
            // Manual parsing is safer if we know the structure.
            // "project-id.appspot.com/o/toolbox_uploads%2Ffilename"

            const bucketEndIndex = pathPart.indexOf("/o/");
            if (bucketEndIndex < 0) return;

            const encodedPath = pathPart.substring(bucketEndIndex + 3);
            const fullPath = decodeURIComponent(encodedPath);

            const fileRef = ref(storage, fullPath);
            await deleteObject(fileRef);
            console.log(`Deleted: ${fullPath}`);
        } catch (error: any) {
            // Ignore "Object not found" errors (already deleted)
            if (error.code !== 'storage/object-not-found') {
                console.error(`Failed to delete ${url}:`, error);
            }
        }
    });

    await Promise.all(deletePromises);
};

/**
 * Performs garbage collection:
 * 1. Lists all files in 'toolbox_uploads/'.
 * 2. Fetches content from Firestore (TeamBoard) and LocalStorage (MyMemo).
 * 3. Identifies files that are NOT referenced in any content.
 * 4. Deletes them.
 */
export const performGarbageCollection = async (): Promise<number> => {
    console.log("Starting Garbage Collection...");

    // 1. Get all files in storage
    const listRef = ref(storage, UPLOAD_PATH);
    const res = await listAll(listRef);
    const allFileRefs = res.items;
    const allFilePaths = new Set(allFileRefs.map(r => r.fullPath));

    console.log(`Found ${allFilePaths.size} files in storage.`);

    // 2. Collect all referenced URLs
    const referencedPaths = new Set<string>();

    const addPathsFromContent = (content: string) => {
        const urls = extractStorageUrls(content);
        urls.forEach(url => {
            try {
                const baseUrl = "https://firebasestorage.googleapis.com/v0/b/";
                if (!url.startsWith(baseUrl)) return;
                let pathPart = url.replace(baseUrl, "");
                const indexOfQuery = pathPart.indexOf("?");
                if (indexOfQuery >= 0) pathPart = pathPart.substring(0, indexOfQuery);
                const bucketEndIndex = pathPart.indexOf("/o/");
                if (bucketEndIndex < 0) return;
                const encodedPath = pathPart.substring(bucketEndIndex + 3);
                const fullPath = decodeURIComponent(encodedPath);
                referencedPaths.add(fullPath);
            } catch (e) {
                console.error("Error parsing URL:", url, e);
            }
        });
    };

    // A. Fetch Firestore Posts
    const postsSnapshot = await getDocs(collection(db, 'toolbox_posts'));
    postsSnapshot.forEach(doc => {
        addPathsFromContent(doc.data().content || '');
    });

    // B. Fetch Firestore Memos
    const memosSnapshot = await getDocs(collection(db, 'toolbox_memos'));
    memosSnapshot.forEach(doc => {
        addPathsFromContent(doc.data().content || '');
    });

    console.log(`Found ${referencedPaths.size} referenced files.`);

    // 3. Identify Orphans
    const orphans: any[] = [];
    allFileRefs.forEach(fileRef => {
        if (!referencedPaths.has(fileRef.fullPath)) {
            orphans.push(fileRef);
        }
    });

    console.log(`Identified ${orphans.length} orphans.`);

    // 4. Delete Orphans
    const deletionPromises = orphans.map(fileRef => deleteObject(fileRef));
    await Promise.all(deletionPromises);

    console.log("Garbage Collection Complete.");
    return orphans.length;
};
