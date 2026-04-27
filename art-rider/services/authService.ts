"use server";

// WHY: Separating Business Logic away from generic Route Components prevents code duplication.
// It explicitly guarantees database mutations execute on the Edge/Server and tokens stay out of explicit browser globals.
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { redirect } from 'next/navigation';

export async function signUp(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = formData.get('phone') as string;
  const birthDate = formData.get('birthDate') as string;

  if (!email || !password || !confirmPassword || !firstName || !lastName || !phone || !birthDate) {
    return { error: 'All fields are required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden. Por favor verifícalas.' };
  }

  // Parameter Constraints: Name Lengths
  if (firstName.length < 2 || firstName.length > 50 || lastName.length < 2 || lastName.length > 50) {
    return { error: 'Nombres y apellidos deben tener entre 2 y 50 caracteres.' };
  }

  // Parameter Constraints: Phone Format
  const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return { error: 'El formato de teléfono ingresado es inválido.' };
  }

  // Parameter Constraints: Birth Date Legitimacy
  const dob = new Date(birthDate);
  const today = new Date();
  
  if (isNaN(dob.getTime()) || dob.getFullYear() < 1900 || dob.getFullYear() > today.getFullYear()) {
    return { error: 'Por favor ingresa una fecha de nacimiento legítima.' };
  }

  // Exact 15+ Age Verification
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 18) {
    return { error: 'Debes ser mayor de 18 años para utilizar ArtRider.' };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error('SignUp Auth Error Full:', authError);
      return { error: authError.message };
    }

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
        
        // Handle Unique Constraint Violation (Postgres Code 23505)
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
  } catch (error: any) {
    console.error('Technical Error during signUp Full object:', error);
    // User Friendly Fallback protecting system traces
    return { error: 'We could not create your account at this time. Please try again.' };
  }

  // Redirect runs outside try-catch to avoid being caught natively by Next.js
  redirect('/login');
}

export async function signIn(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectUrl = (formData.get('redirectUrl') as string) || '/';

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('SignIn Error:', error.message);
      return { error: 'Invalid email or password. Please try again.' };
    }
  } catch (error: any) {
    console.error('Technical Error during signIn:', error.message || error);
    // User Friendly Fallback protecting system traces
    return { error: 'An unexpected error occurred during sign in. Please try again later.' };
  }

  redirect(redirectUrl);
}

export async function signOut() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('SignOut Error:', error.message);
    }
  } catch (error: any) {
    console.error('Technical Error during signOut:', error.message || error);
  }

  redirect('/login');
}
