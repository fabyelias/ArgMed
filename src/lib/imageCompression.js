/**
 * Image compression utility for mobile uploads
 * Compresses images before uploading to reduce bandwidth and storage
 */

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const MAX_SIZE_MB = 5; // Maximum file size in MB
const QUALITY = 0.85; // JPEG quality (0-1)

/**
 * Validates file type
 * @param {File} file - The file to validate
 * @returns {boolean} - Whether the file is valid
 */
export const isValidImageFile = (file) => {
  if (!file) return false;

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  // Check MIME type
  if (file.type && validTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  // Check extension for PDFs
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.pdf')) {
    return true;
  }

  // Fallback to extension check for images without proper MIME
  return validExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Validates file size
 * @param {File} file - The file to validate
 * @returns {boolean} - Whether the file size is within limits
 */
export const isValidFileSize = (file) => {
  if (!file) return false;
  const sizeMB = file.size / (1024 * 1024);
  return sizeMB <= MAX_SIZE_MB;
};

/**
 * Compresses an image file
 * @param {File} file - The image file to compress
 * @returns {Promise<File>} - The compressed image file
 */
export const compressImage = async (file) => {
  // Don't compress PDFs
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return file;
  }

  // Don't compress if already small enough
  if (file.size < 500 * 1024) { // Less than 500KB
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const aspectRatio = width / height;

          if (width > height) {
            width = MAX_WIDTH;
            height = Math.round(MAX_WIDTH / aspectRatio);
          } else {
            height = MAX_HEIGHT;
            width = Math.round(MAX_HEIGHT * aspectRatio);
          }
        }

        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; // White background
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir la imagen'));
              return;
            }

            // Create new file from blob
            const compressedFile = new File(
              [blob],
              file.name,
              {
                type: 'image/jpeg',
                lastModified: Date.now()
              }
            );

            console.log(`Image compressed: ${(file.size / 1024).toFixed(2)}KB -> ${(compressedFile.size / 1024).toFixed(2)}KB`);
            resolve(compressedFile);
          },
          'image/jpeg',
          QUALITY
        );
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Validates and compresses an image file
 * @param {File} file - The file to process
 * @returns {Promise<{valid: boolean, file?: File, error?: string}>}
 */
export const processImageFile = async (file) => {
  try {
    // Validate file type
    if (!isValidImageFile(file)) {
      return {
        valid: false,
        error: 'Formato de archivo no válido. Usa JPG, PNG o PDF.'
      };
    }

    // Validate file size
    if (!isValidFileSize(file)) {
      return {
        valid: false,
        error: `El archivo es demasiado grande. Máximo ${MAX_SIZE_MB}MB.`
      };
    }

    // Compress if it's an image
    const processedFile = await compressImage(file);

    return {
      valid: true,
      file: processedFile
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return {
      valid: false,
      error: error.message || 'Error al procesar el archivo'
    };
  }
};
