'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ShiftType = 'AM' | 'PM' | 'Night';

export interface Preceptor {
  id: string;
  user_id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  created_at?: string;
}

export interface ClinicalShift {
  id: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  shift_type: ShiftType;
  site: string;
  department: string;
  preceptor_id: string;
  hours_logged: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Queries
export async function getPreceptors() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('clinical_preceptors')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };
  return { data } as { data: Preceptor[] };
}

export async function getShiftsByMonth(year: number, month: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('clinical_shifts')
    .select('*, preceptor:clinical_preceptors!clinical_shifts_preceptor_id_fkey(id,name,email,phone,title)')
    .eq('user_id', user.id)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (error) return { error: error.message };
  return { data } as { data: (ClinicalShift & { preceptor: Preceptor })[] };
}

// Mutations
export async function createPreceptor(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const payload = {
    user_id: user.id,
    name: String(form.get('name') || ''),
    email: (form.get('email') as string) || null,
    phone: (form.get('phone') as string) || null,
    title: (form.get('title') as string) || null,
  };

  const { data, error } = await supabase
    .from('clinical_preceptors')
    .insert(payload)
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/clinicals');
  return { success: true, data } as { success: true, data: Preceptor };
}

export async function createShift(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const payload = {
    user_id: user.id,
    date: String(form.get('date') || ''),
    start_time: String(form.get('start_time') || ''),
    end_time: String(form.get('end_time') || ''),
    shift_type: String(form.get('shift_type') || 'AM') as ShiftType,
    site: String(form.get('site') || ''),
    department: String(form.get('department') || ''),
    preceptor_id: String(form.get('preceptor_id') || ''),
    hours_logged: Number(form.get('hours_logged') || 0),
    notes: (form.get('notes') as string) || null,
  };

  const { data, error } = await supabase
    .from('clinical_shifts')
    .insert(payload)
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/clinicals');
  return { success: true, data } as { success: true, data: ClinicalShift };
}

export async function updateShift(id: string, form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const updates: Partial<{
    date: string;
    start_time: string;
    end_time: string;
    shift_type: ShiftType;
    site: string;
    department: string;
    preceptor_id: string;
    hours_logged: number;
    notes: string | null;
  }> = {
    date: (form.get('date') as string) || undefined,
    start_time: (form.get('start_time') as string) || undefined,
    end_time: (form.get('end_time') as string) || undefined,
    shift_type: (form.get('shift_type') as ShiftType) || undefined,
    site: (form.get('site') as string) || undefined,
    department: (form.get('department') as string) || undefined,
    preceptor_id: (form.get('preceptor_id') as string) || undefined,
    hours_logged: form.get('hours_logged') ? Number(form.get('hours_logged')) : undefined,
    notes: (form.get('notes') as string) ?? undefined,
  };

  const { data, error } = await supabase
    .from('clinical_shifts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/clinicals');
  return { success: true, data } as { success: true, data: ClinicalShift };
}

export async function deleteShift(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('clinical_shifts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/clinicals');
  return { success: true };
}
