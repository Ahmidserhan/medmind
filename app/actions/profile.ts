'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Profile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  school?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  email_notifications?: boolean | null;
  theme?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' } as const;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return { error: error.message } as const;
  return { data } as { data: Profile };
}

export async function updateProfile(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' } as const;

  const updates: Partial<{
    full_name: string | null;
    school: string | null;
    bio: string | null;
    email_notifications: boolean;
    theme: string | null;
  }> = {
    full_name: (form.get('full_name') as string) ?? undefined,
    school: (form.get('school') as string) ?? undefined,
    bio: (form.get('bio') as string) ?? undefined,
    email_notifications: form.get('email_notifications') == null ? undefined : String(form.get('email_notifications')) === 'true',
    theme: (form.get('theme') as string) ?? undefined,
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('*')
    .single();
  if (error) return { error: error.message } as const;
  revalidatePath('/profile');
  return { success: true, data } as const;
}

export async function uploadAvatar(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' } as const;

  const file = form.get('file') as File | null;
  if (!file) return { error: 'No file provided' } as const;

  const ext = file.name.split('.').pop();
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || 'bin'}`;

  const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (upErr) return { error: upErr.message } as const;

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = pub.publicUrl;

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', user.id)
    .select('*')
    .single();
  if (error) return { error: error.message } as const;

  revalidatePath('/profile');
  return { success: true, data } as const;
}
