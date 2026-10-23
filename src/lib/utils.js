import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges conditional Tailwind class names cleanly.
 *
 * @param  {...any} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
