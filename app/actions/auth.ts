'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signup(form: FormData) {
  const supabase = await createClient();

  const email = String(form.get('email') || '');
  const password = String(form.get('password') || '');
  const full_name = String(form.get('full_name') || '');

  if (!email || !password) return { error: 'Email and password are required' } as const;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: { full_name },
    },
  });

  if (error) return { error: error.message } as const;

  // If email confirmations are enabled, Supabase will send a link
  return { success: true, requiresEmailConfirmation: true, data } as const;
}

export async function login(form: FormData) {
  const supabase = await createClient();
  const email = String(form.get('email') || '');
  const password = String(form.get('password') || '');

  if (!email || !password) return { error: 'Email and password are required' } as const;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message } as const;

  return { success: true, data } as const;
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message } as const;
  // Supabase SSR client manages auth cookies. No manual deletion needed.
  return { success: true } as const;
}

export async function logoutAndRedirect() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  // Always redirect; optionally you can encode an error flag in the URL if needed
  redirect(error ? '/login?logout=error' : '/login');
}
