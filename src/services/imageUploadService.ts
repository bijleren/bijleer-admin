const EXTERNAL_UPLOAD_URL = 'https://www.instructielezen.be/api/upload_word_image.php';

export interface UploadResult {
  success: boolean;
  filename?: string;
  path?: string;
  word?: string;
  error?: string;
}

export async function uploadImageToExternalServer(
  word: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('word', word);
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result: UploadResult = JSON.parse(xhr.responseText);
          resolve(result);
        } catch (error) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error: UploadResult = JSON.parse(xhr.responseText);
          resolve(error);
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timeout'));
    });

    xhr.open('POST', EXTERNAL_UPLOAD_URL);
    xhr.timeout = 60000;
    xhr.send(formData);
  });
}

export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only JPG, PNG and GIF are allowed';
  }

  if (file.size > maxSize) {
    return 'File too large. Maximum size is 5MB';
  }

  return null;
}
