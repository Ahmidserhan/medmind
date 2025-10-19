'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CalendarEvent {
  id: string;
  user_id?: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM
  end_time?: string | null; // HH:MM
  type?: string | null; // e.g. lecture/rotation/exam
  location?: string | null;
  description?: string | null;
  is_recurring?: boolean | null;
  recurrence_pattern?: string | null; // e.g. weekly, monthly
  recurrence_end_date?: string | null; // YYYY-MM-DD
  color?: string | null; // e.g. #3AAFA9
  created_at?: string;
  updated_at?: string;
}

export async function getEventsByMonth(year: number, month: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
    .order('time', { ascending: true, nullsFirst: true });

  if (error) return { error: error.message };
  return { data } as { data: CalendarEvent[] };
}

export async function createEvent(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowedTypes = ['lecture','exam','clinical','meeting','practice','other'];
  const typeRaw = String(form.get('type') || '').trim().toLowerCase();
  const normalizedType = typeRaw ? (allowedTypes.includes(typeRaw) ? typeRaw : 'other') : 'other';

  const payload = {
    user_id: user.id,
    title: String(form.get('title') || ''),
    date: String(form.get('date') || ''),
    time: (form.get('time') as string) || null,
    end_time: (form.get('end_time') as string) || null,
    type: normalizedType,
    location: (form.get('location') as string) || null,
    description: (form.get('description') as string) || null,
    is_recurring: String(form.get('is_recurring') ?? 'false') === 'true',
    recurrence_pattern: (form.get('recurrence_pattern') as string) || null,
    recurrence_end_date: (form.get('recurrence_end_date') as string) || null,
    color: (form.get('color') as string) || '#0F3D73',
  };

  const { data, error } = await supabase
    .from('calendar_events')
    .insert(payload)
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/calendar');
  return { success: true, data } as { success: true, data: CalendarEvent };
}

export async function updateEvent(id: string, form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const allowedTypes = ['lecture','exam','clinical','meeting','practice','other'];
  const typeRaw = (form.get('type') as string) ?? undefined;
  const normalizedType = typeof typeRaw === 'string' && typeRaw.trim() !== ''
    ? (allowedTypes.includes(typeRaw.trim().toLowerCase()) ? typeRaw.trim().toLowerCase() : 'other')
    : undefined;

  const updates: Partial<{
    title: string;
    date: string;
    time: string | null;
    end_time: string | null;
    type: string;
    location: string | null;
    description: string | null;
    is_recurring: boolean;
    recurrence_pattern: string | null;
    recurrence_end_date: string | null;
    color: string;
  }> = {
    title: (form.get('title') as string) || undefined,
    date: (form.get('date') as string) || undefined,
    time: (form.get('time') as string) ?? undefined,
    end_time: (form.get('end_time') as string) ?? undefined,
    type: normalizedType,
    location: (form.get('location') as string) ?? undefined,
    description: (form.get('description') as string) ?? undefined,
    is_recurring: form.get('is_recurring') == null ? undefined : String(form.get('is_recurring')) === 'true',
    recurrence_pattern: (form.get('recurrence_pattern') as string) ?? undefined,
    recurrence_end_date: (form.get('recurrence_end_date') as string) ?? undefined,
    color: (form.get('color') as string) ?? undefined,
  };

  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/calendar');
  return { success: true, data } as { success: true, data: CalendarEvent };
}

export async function deleteEvent(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/calendar');
  return { success: true };
}
