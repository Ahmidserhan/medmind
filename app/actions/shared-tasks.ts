'use server';

import { createClient } from '@/lib/supabase/server';

export interface SharedTask {
  id: string;
  session_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface AssignmentComment {
  id: string;
  assignment_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface ExamComment {
  id: string;
  exam_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface SharedCalendarEvent {
  id: string;
  session_id: string;
  event_type: 'session' | 'assignment' | 'exam' | 'custom';
  reference_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  color: string;
  created_at: string;
}

// Shared Tasks
export async function getSessionTasks(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('shared_tasks')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const sessionId = formData.get('session_id') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const priority = formData.get('priority') as string;
  const assignedTo = formData.get('assigned_to') as string;
  const dueDate = formData.get('due_date') as string;

  if (!sessionId || !title) {
    return { error: 'Session ID and title are required' };
  }

  const { data, error } = await supabase
    .from('shared_tasks')
    .insert({
      session_id: sessionId,
      created_by: user.id,
      title,
      description: description || null,
      priority: priority || 'medium',
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function updateTaskStatus(taskId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('shared_tasks')
    .update({ status })
    .eq('id', taskId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('shared_tasks')
    .delete()
    .eq('id', taskId)
    .eq('created_by', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// Task Comments
export async function getTaskComments(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };
  return { data };
}

export async function addTaskComment(taskId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: taskId,
      user_id: user.id,
      content,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteTaskComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// Assignment Comments
export async function getAssignmentComments(assignmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('assignment_comments')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };
  return { data };
}

export async function addAssignmentComment(assignmentId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('assignment_comments')
    .insert({
      assignment_id: assignmentId,
      user_id: user.id,
      content,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

// Exam Comments
export async function getExamComments(examId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('exam_comments')
    .select('*')
    .eq('exam_id', examId)
    .order('created_at', { ascending: true });

  if (error) return { error: error.message };
  return { data };
}

export async function addExamComment(examId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('exam_comments')
    .insert({
      exam_id: examId,
      user_id: user.id,
      content,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

// Shared Calendar Events
export async function getSessionCalendarEvents(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('shared_calendar_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('start_time', { ascending: true });

  if (error) return { error: error.message };
  return { data };
}

export async function createCalendarEvent(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const sessionId = formData.get('session_id') as string;
  const eventType = formData.get('event_type') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const startTime = formData.get('start_time') as string;
  const endTime = formData.get('end_time') as string;
  const color = formData.get('color') as string;

  if (!sessionId || !title || !startTime || !endTime) {
    return { error: 'Required fields missing' };
  }

  const { data, error } = await supabase
    .from('shared_calendar_events')
    .insert({
      session_id: sessionId,
      event_type: eventType || 'custom',
      title,
      description: description || null,
      start_time: startTime,
      end_time: endTime,
      color: color || '#0F3D73',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}
