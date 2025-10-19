'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed';
export type AssignmentPriority = 'low' | 'medium' | 'high';

const toDbStatus = (s: AssignmentStatus) => (s === 'pending' ? 'Not Started' : s === 'in_progress' ? 'In Progress' : 'Done');
const toDbPriority = (p: AssignmentPriority | string) => (p === 'low' || p === 'Low' ? 'Low' : p === 'high' || p === 'High' ? 'High' : 'Medium');
const fromDbStatus = (s: string): AssignmentStatus => (s === 'Not Started' ? 'pending' : s === 'In Progress' ? 'in_progress' : 'completed');
const fromDbPriority = (p: string): AssignmentPriority => (p === 'Low' ? 'low' : p === 'High' ? 'high' : 'medium');

export interface Assignment {
  id: string;
  user_id?: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  status: AssignmentStatus;
  priority: AssignmentPriority;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// DB row shape as stored (status/priority are string variants)
type DbAssignmentRow = Omit<Assignment, 'status' | 'priority'> & {
  status: string;
  priority: string;
};

export interface Attachment {
  id: string;
  assignment_id: string;
  type: string; // e.g. 'link' | 'text'
  name: string;
  content: string;
  created_at?: string;
}

export async function getAssignments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true });

  if (error) return { error: error.message };
  const mapped = (data || []).map((row: DbAssignmentRow) => ({
    ...row,
    status: fromDbStatus(row.status),
    priority: fromDbPriority(row.priority),
  })) as Assignment[];
  return { data: mapped } as { data: Assignment[] };
}

export async function createAssignment(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const payload = {
    user_id: user.id,
    title: String(form.get('title') || ''),
    due_date: String(form.get('due_date') || ''),
    status: toDbStatus(String(form.get('status') || 'pending') as AssignmentStatus),
    priority: toDbPriority(String(form.get('priority') || 'medium') as AssignmentPriority),
    notes: (form.get('notes') as string) || null,
  };

  const { data, error } = await supabase
    .from('assignments')
    .insert(payload)
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/assignments');
  return { success: true, data } as { success: true, data: Assignment };
}

export async function updateAssignment(id: string, form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const updates: Partial<{
    title: string;
    due_date: string;
    status: string;
    priority: string;
    notes: string | null;
  }> = {
    title: (form.get('title') as string) || undefined,
    due_date: (form.get('due_date') as string) || undefined,
    status: ((form.get('status') as string) ? toDbStatus(String(form.get('status')) as AssignmentStatus) : undefined),
    priority: ((form.get('priority') as string) ? toDbPriority(String(form.get('priority'))) : undefined),
    notes: (form.get('notes') as string) ?? undefined,
  };

  const { data, error } = await supabase
    .from('assignments')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/assignments');
  return { success: true, data } as { success: true, data: Assignment };
}

export async function deleteAssignment(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/assignments');
  return { success: true };
}
export async function setAssignmentStatus(id: string, status: AssignmentStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const dbValue = toDbStatus(status);
  const { data, error } = await supabase
    .from('assignments')
    .update({ status: dbValue })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) return { error: `Failed updating status to "${dbValue}": ${error.message}` };
  revalidatePath('/assignments');
  return { success: true, data } as { success: true, data: Assignment };
}

export async function addAttachment(form: FormData) {
  const supabase = await createClient();
  const assignment_id = String(form.get('assignment_id') || '');
  const type = String(form.get('type') || 'link');
  const name = String(form.get('name') || '');
  const content = String(form.get('content') || '');

  const { data, error } = await supabase
    .from('assignment_attachments')
    .insert({ assignment_id, type, name, content })
    .select('*')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/assignments');
  return { success: true, data } as { success: true, data: Attachment };
}

export async function deleteAttachment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('assignment_attachments')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/assignments');
  return { success: true };
}
