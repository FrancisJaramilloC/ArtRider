//  Importaciones para utilidades de clases CSS
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Función que combina clases CSS con Tailwind CSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
