import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseUrl(): string {
  // 브라우저 환경
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Vercel 환경
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 로컬 개발 환경
  return `http://localhost:${process.env.PORT || 3000}`;
}
