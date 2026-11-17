import * as Linking from 'expo-linking';

import { supabase } from './supabase';

export interface SignUpParams {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    phone: string;
    birthDate: string; // formato YYYY-MM-DD
}

export type AuthErrorCode = 'invalid_credentials' | 'email_not_confirmed' | 'email_exists' | 'unexpected';

const EMAIL_EXISTS_MESSAGE = 'Ya existe una cuenta con este correo electrónico. Inicia sesión o recupera tu contraseña.';

export interface AuthResult {
    error?: string;
    /** Distingue errores esperados (credenciales, correo sin confirmar) de los inesperados. */
    code?: AuthErrorCode;
    /** signUp: la cuenta se creó pero falta confirmar el correo (no hay sesión). */
    needsVerification?: boolean;
}

/** URL a la que Supabase redirige tras confirmar el correo (esquema de la app, o exp:// en Expo Go). */
export function emailConfirmRedirectUrl(): string {
    return Linking.createURL('auth/confirm');
}

/** Intervalo mínimo entre reenvíos del correo de confirmación. */
export const RESEND_COOLDOWN_SECONDS = 60;

function calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

export async function signUp(params: SignUpParams): Promise<AuthResult> {
    const { email, password, confirmPassword, firstName, lastName, phone, birthDate } = params;

    // Mismas validaciones que la web, replicadas aquí porque no están
    // reforzadas a nivel de base de datos.
    if (!email || !password || !confirmPassword || !firstName || !lastName || !phone || !birthDate) {
        return { error: 'Todos los campos son obligatorios.' };
    }

    if (password !== confirmPassword) {
        return { error: 'Las contraseñas no coinciden. Por favor verifícalas.' };
    }

    if (firstName.length < 2 || firstName.length > 50 || lastName.length < 2 || lastName.length > 50) {
        return { error: 'Nombres y apellidos deben tener entre 2 y 50 caracteres.' };
    }

    const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
    if (!phoneRegex.test(phone)) {
        return { error: 'El formato de teléfono ingresado es inválido.' };
    }

    const dob = new Date(birthDate);
    const today = new Date();

    if (isNaN(dob.getTime()) || dob.getFullYear() < 1900 || dob.getFullYear() > today.getFullYear()) {
        return { error: 'Por favor ingresa una fecha de nacimiento legítima.' };
    }

    if (calculateAge(dob) < 18) {
        return { error: 'Debes ser mayor de 18 años para utilizar ArtRider.' };
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: emailConfirmRedirectUrl(),
                data: {
                    full_name: `${firstName} ${lastName}`.trim(),
                    phone,
                    birth_date: birthDate,
                },
            },
        });

        if (error) {
            // Correo ya registrado: error esperado, sin console.error.
            if (error.code === 'user_already_exists' || error.code === 'email_exists' || /already (been )?registered/i.test(error.message)) {
                return { error: EMAIL_EXISTS_MESSAGE, code: 'email_exists' };
            }
            console.error('SignUp Auth Error:', error);
            return { error: error.message };
        }

        // Mismo comportamiento que la web: identities vacío = email ya existe
        // (Supabase "Prevent Email Enumeration" activo)
        if (data.user?.identities && data.user.identities.length === 0) {
            return { error: EMAIL_EXISTS_MESSAGE, code: 'email_exists' };
        }

        // Con «Confirm email» activo Supabase no devuelve sesión hasta que el usuario abre el enlace.
        // Si sí hay sesión (confirmación desactivada), el guard del layout raíz lo lleva a Home.
        if (!data.session) {
            return { needsVerification: true };
        }

        return {};
    } catch (error: any) {
        console.error('Technical Error during signUp:', error);
        return { error: 'No pudimos crear tu cuenta en este momento. Por favor intenta de nuevo.' };
    }
}

export interface SignInParams {
    email: string;
    password: string;
}

export async function signIn(params: SignInParams): Promise<AuthResult> {
    const { email, password } = params;

    if (!email || !password) {
        return { error: 'El correo electrónico y la contraseña son obligatorios.' };
    }

    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            // Errores esperados: no son fallos de la app, así que no se registran con console.error.
            if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
                return { error: 'Aún no confirmas tu correo. Revisa tu bandeja de entrada o reenvía el enlace.', code: 'email_not_confirmed' };
            }
            if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
                return { error: 'El correo electrónico o la contraseña son incorrectos. Por favor intenta de nuevo.', code: 'invalid_credentials' };
            }
            console.error('Error de inicio de sesión:', error.message);
            return { error: 'No pudimos iniciar sesión. Por favor intenta de nuevo.', code: 'unexpected' };
        }

        return {};
    } catch (error: any) {
        console.error('Error técnico durante el inicio de sesión:', error.message || error);
        return { error: 'Un error inesperado ocurrió durante el inicio de sesión. Por favor intenta de nuevo.', code: 'unexpected' };
    }
}

/** Confirma la cuenta con el código numérico del correo ({{ .Token }}). Si sale bien, Supabase emite SIGNED_IN. */
export async function verifySignupCode(email: string, code: string): Promise<AuthResult> {
    try {
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
        if (error) {
            return { error: 'El código no es válido o ya expiró. Revisa el correo o reenvía el enlace.' };
        }
        return {};
    } catch {
        return { error: 'No pudimos validar el código. Revisa tu conexión e intenta de nuevo.' };
    }
}

/** Reenvía el correo de confirmación de registro. */
export async function resendSignupEmail(email: string): Promise<AuthResult> {
    try {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: emailConfirmRedirectUrl() },
        });
        if (error) {
            if (error.status === 429 || /rate limit|seconds/i.test(error.message)) {
                return { error: 'Espera un momento antes de volver a pedir el correo.' };
            }
            return { error: 'No pudimos reenviar el correo. Intenta de nuevo.' };
        }
        return {};
    } catch {
        return { error: 'No pudimos reenviar el correo. Revisa tu conexión e intenta de nuevo.' };
    }
}


export async function signOut(): Promise<void> {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error.message);
        }
    } catch (error: any) {
        console.error('Error técnico al cerrar sesión:', error.message || error);
    }
}