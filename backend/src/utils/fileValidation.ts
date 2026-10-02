import { ApiError } from './apiError.js';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface UploadedImageLike {
  mimetype: string;
  size: number;
}

export const validateWasteImage = (file?: UploadedImageLike | null) => {
  if (!file) {
    throw new ApiError(400, 'IMAGE_REQUIRED', 'Waste report image is required.');
  }

  if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new ApiError(400, 'INVALID_IMAGE_TYPE', 'Only JPG, PNG, and WebP images are allowed.');
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(400, 'IMAGE_TOO_LARGE', 'Image size must not exceed 10 MB.');
  }
};
