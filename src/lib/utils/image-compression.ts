import imageCompression from 'browser-image-compression';

/**
 * 이미지를 500KB 미만으로 압축하는 함수
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5, // 500KB = 0.5MB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('이미지 압축 중 오류 발생:', error);
    throw new Error('이미지 압축에 실패했습니다.');
  }
}

/**
 * 파일을 Base64로 변환하는 함수
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Base64를 Blob으로 변환하는 함수
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * 이미지 파일 유효성 검사
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // 파일 타입 검사
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'JPG, PNG, WebP 형식의 이미지만 업로드 가능합니다.',
    };
  }

  // 파일 크기 검사 (10MB 제한)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: '이미지 크기는 10MB 이하여야 합니다.',
    };
  }

  return { isValid: true };
}
