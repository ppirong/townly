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

// DTO 매퍼를 위한 안전 변환 유틸리티
export function toISOString(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return new Date(date).toISOString();
  return date.toISOString();
}

export function toISOStringOrNull(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return new Date(date).toISOString();
  return date.toISOString();
}

export function toSafeNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function toSafeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  return [];
}

export function toRecord(value: unknown): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

export function mapArraySafely<T, R>(
  array: unknown,
  mapFn: (item: T) => R
): R[] {
  const safeArray = toSafeArray<T>(array);
  return safeArray.map(mapFn);
}

// snake_case ↔ camelCase 변환
export function snakeToCamel(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

export function camelToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}
