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

export interface AuthResult {
    error?: string;
}

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
                data: {
                    full_name: `${firstName} ${lastName}`.trim(),
                    phone,
                    birth_date: birthDate,
                },
            },
        });

        if (error) {
            console.error('SignUp Auth Error:', error);
            return { error: error.message };
        }

        // Mismo comportamiento que la web: identities vacío = email ya existe
        // (Supabase "Prevent Email Enumeration" activo)
        if (data.user?.identities && data.user.identities.length === 0) {
            return { error: 'Ya existe una cuenta con este correo electrónico.' };
        }

        // Igual que la web: aunque signUp() ya haya creado sesión (si el
        // proyecto tiene "Confirm email" desactivado), forzamos logout para
        // que el usuario pase por login manual, no quede logueado automático.
        if (data.session) {
            await supabase.auth.signOut();
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
            console.error('Error de inicio de sesión:', error.message);
            return { error: 'El correo electrónico o la contraseña son incorrectos. Por favor intenta de nuevo.' };
        }

        return {};
    } catch (error: any) {
        console.error('Error técnico durante el inicio de sesión:', error.message || error);
        return { error: 'Un error inesperado ocurrió durante el inicio de sesión. Por favor intenta de nuevo.' };
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