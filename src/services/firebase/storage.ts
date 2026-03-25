import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Timestamp } from 'firebase/firestore';
import { storage } from './config';
import type { StubPhoto } from '@/types';

export const MAX_PHOTOS = 10;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface UploadResult {
  photos: StubPhoto[];
  failedCount: number;
}

/** Resize an image to max 1920px on its longest side and re-encode as JPEG 0.8 quality */
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX = 1920;
      let { width, height } = img;

      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob returned null'));
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Upload an array of files to Cloud Storage under stubs/{stubId}/.
 * Returns a list of StubPhoto objects and a count of any failures.
 */
export async function uploadStubPhotos(
  stubId: string,
  files: File[]
): Promise<UploadResult> {
  const photos: StubPhoto[] = [];
  let failedCount = 0;

  for (const file of files) {
    try {
      const photoId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const storagePath = `stubs/${stubId}/${photoId}.jpg`;
      const storageRef = ref(storage, storagePath);

      const compressed = await compressImage(file);
      await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);

      photos.push({
        url,
        storageRef: storagePath,
        timestamp: Timestamp.now(),
      });
    } catch (err) {
      console.error('Failed to upload photo:', err);
      failedCount++;
    }
  }

  return { photos, failedCount };
}
