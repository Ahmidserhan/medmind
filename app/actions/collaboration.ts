'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Types
export interface Session {
  id: string;
  user_id?: string; // owner
  title: string;
  description?: string | null;
  visibility: 'public' | 'private';
  access_code?: string | null;
  scheduled_at?: string | null; // ISO
  duration_mins?: number | null;
  created_at?: string;
}

export async function listParticipants(session_id: string) {
  const supabase = await createClient();
  // 1) Get participant rows
  const { data: parts, error: e1 } = await supabase
    .from('collab_session_participants')
    .select('id, session_id, user_id, role, joined_at')
    .eq('session_id', session_id)
    .order('joined_at', { ascending: true });
  if (e1) return { error: e1.message } as const;

  const ids = Array.from(new Set((parts || []).map(p => p.user_id)));
  if (ids.length === 0) return { data: [] as ParticipantWithProfile[] } as const;

  // 2) Fetch profiles separately (no FK requirement for relational select)
  const { data: profs, error: e2 } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', ids);
  if (e2) return { error: e2.message } as const;

  const map = new Map(profs!.map(p => [p.id, p] as const));
  const merged: ParticipantWithProfile[] = (parts || []).map(p => ({
    id: p.id,
    session_id: p.session_id,
    user_id: p.user_id,
    role: (p as { role?: string | null }).role ?? null,
    joined_at: p.joined_at,
    profile: map.get(p.user_id) || null,
  }));

  return { data: merged } as const;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  role?: string | null;
  joined_at?: string;
}

export interface SessionComment {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  created_at?: string;
}

export interface Thread {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at?: string;
}

export interface Reply {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  created_at?: string;
}

export interface ParticipantWithProfile {
  id: string; // participant row id
  session_id: string;
  user_id: string;
  role?: string | null;
  joined_at?: string;
  profile?: { id: string; email?: string | null; full_name?: string | null } | null;
}

// Sessions
export async function listSessions(page = 1, pageSize = 10) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from('collab_sessions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) return { error: error.message };
  return { data, count } as { data: Session[]; count: number | null };
}

export async function createSession(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const payload = {
    user_id: user.id,
    title: String(form.get('title') || ''),
    description: (form.get('description') as string) || null,
    visibility: (form.get('visibility') as string) === 'private' ? 'private' : 'public',
    access_code: (form.get('access_code') as string) || null,
    scheduled_at: (form.get('scheduled_at') as string) || null,
    duration_mins: form.get('duration_mins') ? Number(form.get('duration_mins')) : null,
  };
  const { data, error } = await supabase
    .from('collab_sessions')
    .insert(payload)
    .select('*')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true, data } as { success: true, data: Session };
}

export async function joinSession(session_id: string, access_code?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Validate private access code if needed
  const { data: sess, error: e1 } = await supabase
    .from('collab_sessions')
    .select('id, visibility, access_code')
    .eq('id', session_id)
    .single();
  if (e1) return { error: e1.message };
  if (sess.visibility === 'private' && sess.access_code && sess.access_code !== access_code) {
    return { error: 'Invalid access code' };
  }

  const { data, error } = await supabase
    .from('collab_session_participants')
    .insert({ session_id, user_id: user.id })
    .select('*')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true, data } as { success: true, data: SessionParticipant };
}

export async function leaveSession(session_id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('collab_session_participants')
    .delete()
    .eq('session_id', session_id)
    .eq('user_id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true };
}

export async function addSessionComment(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const payload = {
    session_id: String(form.get('session_id') || ''),
    user_id: user.id,
    content: String(form.get('content') || ''),
  };
  const { data, error } = await supabase
    .from('collab_session_comments')
    .insert(payload)
    .select('*')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true, data } as { success: true, data: SessionComment };
}

// Threads
export async function listThreads(page = 1, pageSize = 10) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from('collab_threads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) return { error: error.message };
  return { data, count } as { data: Thread[]; count: number | null };
}

// Voting
export async function voteSession(session_id: string, value: 1 | -1) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('collab_session_votes')
    .upsert({ session_id, user_id: user.id, value }, { onConflict: 'session_id,user_id' });
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true } as const;
}

// Upload + register attachment via Supabase Storage (bucket 'collab')
export async function uploadAttachment(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const kind = String(form.get('kind') || '');
  const target_id = String(form.get('target_id') || '');
  const file = form.get('file') as File | null;
  if (!file) return { error: 'No file provided' } as const;

  const ext = file.name.split('.').pop();
  const path = `${kind}s/${target_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext || 'bin'}`;

  const { error: upErr } = await supabase.storage.from('collab').upload(path, file);
  if (upErr) return { error: upErr.message } as const;

  const { data: pub } = supabase.storage.from('collab').getPublicUrl(path);
  const url = pub.publicUrl;

  const res = await addAttachment(kind as 'session'|'thread', target_id, file.name, path, url);
  return res;
}

// Score helpers
export async function getSessionScores(ids: string[]) {
  if (!ids.length) return { data: [] as { session_id: string; score: number }[] } as const;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collab_session_scores')
    .select('*')
    .in('session_id', ids);
  if (error) return { error: error.message } as const;
  return { data } as const;
}

export async function getThreadScores(ids: string[]) {
  if (!ids.length) return { data: [] as { thread_id: string; score: number }[] } as const;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collab_thread_scores')
    .select('*')
    .in('thread_id', ids);
  if (error) return { error: error.message } as const;
  return { data } as const;
}

export async function voteThread(thread_id: string, value: 1 | -1) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { error } = await supabase
    .from('collab_thread_votes')
    .upsert({ thread_id, user_id: user.id, value }, { onConflict: 'thread_id,user_id' });
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true } as const;
}

// Attachments (metadata, file should be uploaded to storage bucket 'collab')
export async function addAttachment(kind: 'session'|'thread', target_id: string, name: string, path: string, url?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('collab_attachments')
    .insert({ user_id: user.id, kind, target_id, name, path, url: url || null })
    .select('*')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true, data } as const;
}

export async function listAttachments(kind: 'session'|'thread', target_id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collab_attachments')
    .select('*')
    .eq('kind', kind)
    .eq('target_id', target_id)
    .order('created_at', { ascending: false });
  if (error) return { error: error.message };
  return { data } as const;
}

export async function deleteAttachment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('collab_attachments')
    .delete()
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true } as const;
}

export async function createThread(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const payload = {
    user_id: user.id,
    title: String(form.get('title') || ''),
    content: String(form.get('content') || ''),
  };
  const { data, error } = await supabase
    .from('collab_threads')
    .insert(payload)
    .select('*')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true, data } as { success: true, data: Thread };
}

export async function addReply(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const payload = {
    thread_id: String(form.get('thread_id') || ''),
    user_id: user.id,
    content: String(form.get('content') || ''),
  };
  const { data, error } = await supabase
    .from('collab_thread_replies')
    .insert(payload)
    .select('*')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/collaboration');
  return { success: true, data } as { success: true, data: Reply };
}
