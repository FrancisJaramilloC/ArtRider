"use server";

// WHY: Separating Business Logic away from generic Route Components prevents code duplication.
// It explicitly guarantees database mutations execute on the Edge/Server and tokens stay out of explicit browser globals.
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import { getAuthCallbackUrl } from '@/lib/siteUrl';

export type AuthActionState = {
  error?: string;
  /** signIn: permite mostrar «Reenviar correo» cuando falta confirmar. */
  code?: 'email_not_confirmed';
  /** Correo al que se debe reenviar el enlace de confirmación. */
  email?: string;
  /** signUp: cuenta creada sin sesión; falta confirmar el correo. */
  pendingEmail?: string;
} | null;

//  Función de registro
export async function signUp(prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = formData.get('phone') as string;
  const birthDate = formData.get('birthDate') as string;

  //  Valida que todos los campos requeridos sean completados.
  if (!email || !password || !confirmPassword || !firstName || !lastName || !phone || !birthDate) {
    return { error: 'All fields are required.' };
  }

  //  Valida que las contraseñas coincidan
  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden. Por favor verifícalas.' };
  }

  //  Valida la longitud de los nombres y apellidos
  if (firstName.length < 2 || firstName.length > 50 || lastName.length < 2 || lastName.length > 50) {
    return { error: 'Nombres y apellidos deben tener entre 2 y 50 caracteres.' };
  }

  //  Valida el formato del teléfono
  const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return { error: 'El formato de teléfono ingresado es inválido.' };
  }

  //  Valida la legitimidad de la fecha de nacimiento
  const dob = new Date(birthDate);
  const today = new Date();
  
  if (isNaN(dob.getTime()) || dob.getFullYear() < 1900 || dob.getFullYear() > today.getFullYear()) {
    return { error: 'Por favor ingresa una fecha de nacimiento legítima.' };
  }

  //  Verifica que el usuario sea mayor de 18 años
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 18) {
    return { error: 'Debes ser mayor de 18 años para utilizar ArtRider.' };
  }

  //  Intenta crear la cuenta
  let hasSession = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: await getAuthCallbackUrl() },
    });
    
    if (authError) {
      console.error('SignUp Auth Error Full:', authError);
      return { error: authError.message };
    }

    hasSession = !!authData.session;

    if (authData.user) {
      // Supabase "Prevent Email Enumeration" active: If identities array is empty,
      // it means the email already exists and Supabase returned a dummy ID.
      // We block it here to prevent throwing PostgreSQL Foreign Key errors.
      if (authData.user.identities && authData.user.identities.length === 0) {
        return { error: 'An account with this email address already exists.' };
      }

      // Insert profile data into "profiles" table to satisfy business logic PRD
      // Uses the Admin client to bypass RLS "WITH CHECK (false)" on "profiles" table inserts
      const supabaseAdmin = createSupabaseAdminClient();
      const { error: insertError } = await supabaseAdmin.from('profiles').insert({
        id: authData.user.id,
        email: authData.user.email,
        full_name: `${firstName} ${lastName}`.trim(),
        phone: phone,
        birth_date: birthDate,
      });

      if (insertError) {
        console.error('Profiles Table Insert Error Full (Admin):', insertError);
        
        //  Maneja la violación de restricción única (Postgres Code 23505)
        if (insertError.code === '23505') {
          if (insertError.message.includes('phone')) {
            return { error: 'Este número de teléfono ya está registrado con otra cuenta.' };
          }
          if (insertError.message.includes('email')) {
            return { error: 'Este correo electrónico ya está registrado.' };
          }
        }

        return { error: `Account created but failed to initialize profile: ${insertError.message}` };
      }
    }
  } catch (error: unknown) {
    console.error('Technical Error during signUp Full object:', error);
    // User Friendly Fallback protecting system traces
    return { error: 'We could not create your account at this time. Please try again.' };
  }

  //  Con «Confirm email» activo no hay sesión: se pide confirmar el correo en lugar de redirigir en silencio.
  if (!hasSession) {
    return { pendingEmail: email };
  }

  redirect('/');
}

//  Reenvía el correo de confirmación de registro
export async function resendConfirmation(email: string): Promise<{ error?: string }> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Ingresa un correo electrónico válido.' };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: await getAuthCallbackUrl() },
    });
    if (error) {
      if (error.status === 429 || /rate limit|seconds/i.test(error.message)) {
        return { error: 'Espera un momento antes de volver a pedir el correo.' };
      }
      console.error('Resend confirmation error:', error.message);
      return { error: 'No pudimos reenviar el correo. Intenta de nuevo.' };
    }
    return {};
  } catch (error) {
    console.error('Technical Error during resendConfirmation:', error);
    return { error: 'No pudimos reenviar el correo. Intenta de nuevo.' };
  }
}

//  Función de inicio de sesión
export async function signIn(prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const rawRedirect = (formData.get('redirectUrl') as string) || '/';
  const redirectUrl = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

  //  Valida que todos los campos requeridos sean completados.
  if (!email || !password) {
    return { error: 'El correo electrónico y la contraseña son obligatorios.' };
  }

  //  Intenta iniciar sesión
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    //  Maneja los errores de inicio de sesión
    if (error) {
      if (error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message)) {
        return { error: 'Aún no confirmas tu correo. Revisa tu bandeja de entrada o reenvía el enlace.', code: 'email_not_confirmed', email };
      }
      console.error('Error de inicio de sesión:', error.message);
      return { error: 'El correo electrónico o la contraseña son incorrectos. Por favor intenta de nuevo.' };
    }
  } catch (error: unknown) {
    console.error('Error técnico durante el inicio de sesión:', error instanceof Error ? error.message : error);
    // User Friendly Fallback protecting system traces
    return { error: 'Un error inesperado ocurrió durante el inicio de sesión. Por favor intenta de nuevo.' };
  }

  //  Redirige al usuario a la página de inicio
  redirect(redirectUrl);
}

//  Función de cierre de sesión
export async function signOut() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error al cerrar sesión:', error.message);
    }
  } catch (error: unknown) {
    console.error('Error técnico al cerrar sesión:', error instanceof Error ? error.message : error);
  }

  //  Redirige al usuario a la página de inicio de sesión
  redirect('/login');
}
