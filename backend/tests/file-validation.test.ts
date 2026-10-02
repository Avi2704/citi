import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/utils/apiError.js';
import { validateWasteImage } from '../src/utils/fileValidation.js';

describe('image validation', () => {
  it('accepts supported format within size limit', () => {
    expect(() => validateWasteImage({ mimetype: 'image/jpeg', size: 2048 })).not.toThrow();
  });

  it('rejects unsupported mime type', () => {
    expect(() => validateWasteImage({ mimetype: 'application/pdf', size: 1000 })).toThrow(ApiError);
  });

  it('rejects oversized image', () => {
    expect(() => validateWasteImage({ mimetype: 'image/png', size: 11 * 1024 * 1024 })).toThrow(ApiError);
  });
});
