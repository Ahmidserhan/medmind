'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface Exam {
  id: string;
  user_id?: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM
  location?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getExamsByMonth(year: number, month: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
    .order('time', { ascending: true, nullsFirst: true });

  if (error) return { error: error.message };
  return { data } as { data: Exam[] };
}

export async function createExam(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const payload = {
    user_id: user.id,
    title: String(form.get('title') || ''),
    date: String(form.get('date') || ''),
    time: (form.get('time') as string) || null,
    location: (form.get('location') as string) || null,
    description: (form.get('description') as string) || null,
  };

  const { data, error } = await supabase
    .from('exams')
    .insert(payload)
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/exams');
  return { success: true, data } as { success: true, data: Exam };
}

export async function updateExam(id: string, form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const updates: Partial<{
    title: string;
    date: string;
    time: string | null;
    location: string | null;
    description: string | null;
  }> = {
    title: (form.get('title') as string) || undefined,
    date: (form.get('date') as string) || undefined,
    time: (form.get('time') as string) ?? undefined,
    location: (form.get('location') as string) ?? undefined,
    description: (form.get('description') as string) ?? undefined,
  };

  const { data, error } = await supabase
    .from('exams')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/exams');
  return { success: true, data } as { success: true, data: Exam };
}

export async function deleteExam(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/exams');
  return { success: true };
}
