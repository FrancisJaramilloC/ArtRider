"use server";

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { redirect } from 'next/navigation';

export async function signUp(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  if (!email || !password || !firstName || !lastName) {
    return { error: 'All fields are required.' };
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
      // Insert profile data into "users" table to satisfy business logic PRD
      // Uses the Admin client to bypass RLS "WITH CHECK (false)" on "users" table inserts
      const supabaseAdmin = createSupabaseAdminClient();
      const { error: insertError } = await supabaseAdmin.from('users').insert({
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
      });

      if (insertError) {
        console.error('Users Table Insert Error Full (Admin):', insertError);
        return { error: `Account created but failed to initialize profile: ${insertError.message}` };
      }
    }
  } catch (error: any) {
    console.error('Technical Error during signUp Full object:', error);
    return { error: error.message || 'An unexpected technical error occurred.' };
  }

  // Redirect runs outside try-catch to avoid being caught natively by Next.js
  redirect('/login');
}

export async function signIn(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

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
      return { error: 'Invalid login credentials.' };
    }
  } catch (error: any) {
    console.error('Technical Error during signIn:', error.message || error);
    return { error: error.message || 'Unexpected error' };
  }

  redirect('/dashboard');
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
