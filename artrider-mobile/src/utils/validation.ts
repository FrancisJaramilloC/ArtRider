/** Validación de formularios por campo (sin dependencias). Cada regla devuelve un mensaje en español o null si es válida. */
export type Rule<Values = Record<string, string>> = (value: string, values: Values) => string | null;

/** Primer mensaje de error de una lista de reglas, o null. */
export function runRules<Values>(rules: Rule<Values>[], value: string, values: Values): string | null {
  for (const rule of rules) {
    const message = rule(value, values);
    if (message) return message;
  }
  return null;
}

export const required =
  (message: string): Rule =>
  (value) =>
    value.trim().length === 0 ? message : null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const email =
  (message = 'Ingresa un correo válido, como nombre@correo.com'): Rule =>
  (value) =>
    value.trim().length === 0 || EMAIL_PATTERN.test(value.trim()) ? null : message;

export const minLength =
  (min: number, message?: string): Rule =>
  (value) =>
    value.trim().length === 0 || value.trim().length >= min ? null : (message ?? `Debe tener al menos ${min} caracteres`);

export const maxLength =
  (max: number, message?: string): Rule =>
  (value) =>
    value.trim().length <= max ? null : (message ?? `Máximo ${max} caracteres`);

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRequirement = { key: string; label: string; met: boolean };

/** Requisitos de contraseña del registro (los muestra el indicador y los valida `strongPassword`). */
export function passwordRequirements(value: string): PasswordRequirement[] {
  return [
    { key: 'length', label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`, met: value.length >= PASSWORD_MIN_LENGTH },
    { key: 'letter', label: 'Una letra', met: /\p{L}/u.test(value) },
    { key: 'number', label: 'Un número', met: /\d/.test(value) },
  ];
}

export const strongPassword =
  (message = 'La contraseña no cumple los requisitos'): Rule =>
  (value) =>
    value.length === 0 || passwordRequirements(value).every((requirement) => requirement.met) ? null : message;

/** Números con coma o punto decimal («12,50» y «12.50»). NaN si no es un número. */
export function parseNumber(value: string): number {
  const normalized = value.trim().replace(',', '.');
  return normalized === '' ? NaN : Number(normalized);
}

/** Precio en dólares mayor a 0 (vacío se deja a `required`). */
export const positivePrice =
  (message = 'Ingresa un precio mayor a 0'): Rule =>
  (value) => {
    if (value.trim().length === 0) return null;
    const n = parseNumber(value);
    return Number.isFinite(n) && n > 0 ? null : message;
  };

/** Entero ≥ min (p. ej. capacidad, cantidad). */
export const integerAtLeast =
  (min: number, message?: string): Rule =>
  (value) => {
    if (value.trim().length === 0) return null;
    const n = parseNumber(value);
    return Number.isInteger(n) && n >= min ? null : (message ?? `Ingresa un número entero de ${min} o más`);
  };

export const sameAs =
  (otherField: string, message: string): Rule<Record<string, string>> =>
  (value, values) =>
    value === values[otherField] ? null : message;

const PHONE_PATTERN = /^\+?[0-9\s\-()]{10,15}$/;

/** Teléfono: mismo formato que valida el registro (10 a 15 caracteres: dígitos, espacios, guiones, paréntesis y un + inicial). */
export const phone =
  (message = 'Ingresa un teléfono válido, por ejemplo +593 999 999 999'): Rule =>
  (value) =>
    value.trim().length === 0 || PHONE_PATTERN.test(value.trim()) ? null : message;

/** Mayor de edad a partir de una fecha ISO «YYYY-MM-DD» (vacío se deja a `required`). */
export const adult =
  (message = 'Debes ser mayor de 18 años para usar ArtRider'): Rule =>
  (value) => {
    if (!value) return null;
    const dob = new Date(value);
    if (Number.isNaN(dob.getTime())) return 'Selecciona una fecha de nacimiento válida';
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const beforeBirthday = now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
    if (beforeBirthday) age -= 1;
    return age >= 18 ? null : message;
  };
