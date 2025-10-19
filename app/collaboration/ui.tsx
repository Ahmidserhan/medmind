
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createBrowserSupabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  listSessions, createSession, joinSession, addSessionComment,
  listThreads, createThread, addReply,
  voteSession, voteThread,
  listParticipants, getSessionScores, getThreadScores,
  uploadAttachment, listAttachments, deleteAttachment,
  type Session,
  type Thread,
  type ParticipantWithProfile,
} from '@/app/actions/collaboration';

export default function CollaborationClient() {
  const router = useRouter();
  const [tab, setTab] = useState<'planning'|'discuss'>('planning');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionPage, setSessionPage] = useState(1);
  const [threadPage, setThreadPage] = useState(1);
  const pageSize = 10;
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [threadCount, setThreadCount] = useState<number>(0);
  const [sessionScores, setSessionScores] = useState<Record<string, number>>({});
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [threadScores, setThreadScores] = useState<Record<string, number>>({});
  const totalSessionPages = useMemo(() => Math.max(1, Math.ceil((sessionCount || 0) / pageSize)), [sessionCount]);
  const totalThreadPages = useMemo(() => Math.max(1, Math.ceil((threadCount || 0) / pageSize)), [threadCount]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [s, t] = await Promise.all([
        listSessions(sessionPage, pageSize),
        listThreads(threadPage, pageSize),
      ]);
      if ('error' in s) Swal.fire({ icon: 'error', title: 'Load sessions failed', text: s.error });
      else {
        setSessions(s.data);
        setSessionCount(s.count || 0);
        const ids = s.data.map((x) => x.id);
        const sc = await getSessionScores(ids);
        if (!('error' in sc)) {
          const map: Record<string, number> = {};
          sc.data.forEach((r: { session_id: string; score: number }) => { map[r.session_id] = r.score; });
          setSessionScores(map);
        }
      }

      if ('error' in t) Swal.fire({ icon: 'error', title: 'Load threads failed', text: t.error });
      else {
        setThreads(t.data);
        setThreadCount(t.count || 0);
        const ids = t.data.map((x) => x.id);
        const sc = await getThreadScores(ids);
        if (!('error' in sc)) {
          const map: Record<string, number> = {};
          sc.data.forEach((r: { thread_id: string; score: number }) => { map[r.thread_id] = r.score; });
          setThreadScores(map);
        }
      }
      setLoading(false);
    };
    load();
  }, [sessionPage, threadPage]);

  // Fetch sessions the current user already joined (single query)
  useEffect(() => {
    (async () => {
      const supa = createBrowserSupabase();
      const { data: auth } = await supa.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data, error } = await supa
        .from('collab_session_participants')
        .select('session_id')
        .eq('user_id', uid);
      if (!error && data) setJoined(new Set((data as Array<{ session_id: string }>).map(r => r.session_id)));
    })();
  }, []);

  const newSession = async () => {
    const { value } = await Swal.fire<{ title: string; description: string; visibility: 'public'|'private'; access_code: string }>({
      title: '<span style="color: #0F3D73; font-weight: 600;">Create New Session</span>',
      html: `
        <div style="text-align: left; padding: 0 1rem;">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Session Title *</label>
            <input id="title" type="text" placeholder="e.g., Study Group for Midterms" style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.875rem; outline: none;" />
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Description</label>
            <textarea id="description" rows="3" placeholder="What will you discuss or work on together?" style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.875rem; outline: none; resize: vertical;"></textarea>
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Privacy</label>
            <select id="visibility" style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.875rem; outline: none; background: white;">
              <option value="public">Public - Anyone can join</option>
              <option value="private">Private - Requires access code</option>
            </select>
          </div>
          <div id="access_code_container" style="margin-bottom: 1rem; display: none;">
            <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Access Code</label>
            <input id="access_code" type="text" placeholder="Enter a code for private access" style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.875rem; outline: none;" />
            <p style="font-size: 0.75rem; color: #6B7280; margin-top: 0.25rem;">Share this code with people you want to invite</p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Create Session',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white font-medium shadow-lg',
        cancelButton: 'px-6 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium'
      },
      buttonsStyling: false,
      didOpen: () => {
        const visibilitySelect = document.getElementById('visibility') as HTMLSelectElement;
        const accessCodeContainer = document.getElementById('access_code_container');
        visibilitySelect?.addEventListener('change', (e) => {
          const val = (e.target as HTMLSelectElement).value;
          if (accessCodeContainer) {
            accessCodeContainer.style.display = val === 'private' ? 'block' : 'none';
          }
        });
      },
      preConfirm: () => {
        const title = (document.getElementById('title') as HTMLInputElement).value.trim();
        const visibility = (document.getElementById('visibility') as HTMLSelectElement).value;
        const accessCode = (document.getElementById('access_code') as HTMLInputElement).value.trim();
        
        if (!title) {
          Swal.showValidationMessage('Please enter a session title');
          return;
        }
        if (visibility === 'private' && !accessCode) {
          Swal.showValidationMessage('Please enter an access code for private sessions');
          return;
        }
        
        return {
          title,
          description: (document.getElementById('description') as HTMLTextAreaElement).value.trim(),
          visibility,
          access_code: visibility === 'private' ? accessCode : '',
        };
      }
    });
    if (!value) return;
    const fd = new FormData();
    Object.entries(value).forEach(([k,v]) => fd.append(k, String(v)));
    Swal.fire({ 
      title: 'Creating session...', 
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'rounded-2xl' }
    });
    const res = await createSession(fd);
    if ('error' in res) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Failed to create session', 
        text: res.error,
        customClass: { popup: 'rounded-2xl' }
      });
    } else { 
      await Swal.fire({ 
        icon: 'success', 
        title: 'Session created!', 
        text: 'Your collaboration session is ready',
        timer: 1500,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' }
      });
      setSessions(prev => [res.data, ...prev]); 
    }
  };

  const handleJoin = async (s: Session) => {
    let code: string | undefined;
    if (s.visibility === 'private') {
      const { value } = await Swal.fire<string>({
        title: '<span style="color: #0F3D73; font-weight: 600;">Enter Access Code</span>',
        html: `
          <div style="text-align: left; padding: 0 1rem;">
            <p style="font-size: 0.875rem; color: #6B7280; margin-bottom: 1rem;">This is a private session. Please enter the access code to join.</p>
            <input id="access-code-input" type="text" placeholder="Enter code" style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.875rem; outline: none;" />
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Join Session',
        cancelButtonText: 'Cancel',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white font-medium shadow-lg',
          cancelButton: 'px-6 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium'
        },
        buttonsStyling: false,
        preConfirm: () => {
          const input = document.getElementById('access-code-input') as HTMLInputElement;
          const val = input?.value.trim();
          if (!val) {
            Swal.showValidationMessage('Please enter the access code');
            return;
          }
          return val;
        }
      });
      if (!value) return; code = value;
    }
    const res = await joinSession(s.id, code);
    if ('error' in res) {
      const msg = res.error || '';
      if (msg.toLowerCase().includes('duplicate key value') || msg.toLowerCase().includes('unique constraint')) {
        // Already a member → just enter
        router.push(`/collaboration/session/${s.id}`);
        return;
      }
      Swal.fire({ icon: 'error', title: 'Join failed', text: msg });
      return;
    }
    // Mark as joined locally and enter
    setJoined(prev => new Set(prev).add(s.id));
    await Swal.fire({ 
      icon: 'success', 
      title: 'Joined successfully!', 
      text: 'Redirecting to session room...',
      timer: 1000, 
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' }
    });
    router.push(`/collaboration/session/${s.id}`);
  };

  
  // (leave handler unused here; implement where needed)

  const comment = async (s: Session) => {
    const { value } = await Swal.fire<string>({
      title: '<span style="color: #0F3D73; font-weight: 600;">Add Comment</span>',
      html: `
        <div style="text-align: left; padding: 0 1rem;">
          <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Your comment</label>
          <textarea id="comment-input" rows="4" placeholder="Share your thoughts about this session..." style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.875rem; outline: none; resize: vertical;"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Post Comment',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white font-medium shadow-lg',
        cancelButton: 'px-6 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium'
      },
      buttonsStyling: false,
      preConfirm: () => {
        const input = document.getElementById('comment-input') as HTMLTextAreaElement;
        const val = input?.value.trim();
        if (!val) {
          Swal.showValidationMessage('Please enter a comment');
          return;
        }
        return val;
      }
    });
    if (!value) return;
    const fd = new FormData();
    fd.append('session_id', s.id);
    fd.append('content', value);
    const res = await addSessionComment(fd);
    if ('error' in res) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Failed to post', 
        text: res.error,
        customClass: { popup: 'rounded-2xl' }
      });
    } else {
      await Swal.fire({ 
        icon: 'success', 
        title: 'Comment posted!', 
        timer: 1200,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' }
      });
    }
  };

  const newThread = async () => {
    const { value } = await Swal.fire<{ title: string; content: string }>({
      title: '<span style="color: #0F3D73; font-weight: 600;">Start New Discussion</span>',
      html: `
        <div style="text-align: left; padding: 0 1rem;">
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Thread Title *</label>
            <input id="title" type="text" placeholder="e.g., Tips for Anatomy Exam" style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.875rem; outline: none;" />
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Content *</label>
            <textarea id="content" rows="5" placeholder="Share your thoughts, ask questions, or start a discussion..." style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.875rem; outline: none; resize: vertical;"></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Create Thread',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white font-medium shadow-lg',
        cancelButton: 'px-6 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium'
      },
      buttonsStyling: false,
      preConfirm: () => {
        const title = (document.getElementById('title') as HTMLInputElement).value.trim();
        const content = (document.getElementById('content') as HTMLTextAreaElement).value.trim();
        if (!title) {
          Swal.showValidationMessage('Please enter a thread title');
          return;
        }
        if (!content) {
          Swal.showValidationMessage('Please enter some content');
          return;
        }
        return { title, content };
      }
    });
    if (!value) return;
    const fd = new FormData();
    Object.entries(value).forEach(([k,v]) => fd.append(k, String(v)));
    Swal.fire({ 
      title: 'Creating thread...', 
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'rounded-2xl' }
    });
    const res = await createThread(fd);
    if ('error' in res) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Failed to create thread', 
        text: res.error,
        customClass: { popup: 'rounded-2xl' }
      });
    } else { 
      await Swal.fire({ 
        icon: 'success', 
        title: 'Thread created!', 
        timer: 1200,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' }
      });
      setThreads(prev => [res.data, ...prev]); 
    }
  };

  const reply = async (thread_id: string) => {
    const { value } = await Swal.fire<string>({
      title: '<span style="color: #0F3D73; font-weight: 600;">Reply to Thread</span>',
      html: `
        <div style="text-align: left; padding: 0 1rem;">
          <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Your reply</label>
          <textarea id="reply-input" rows="5" placeholder="Share your thoughts or answer the question..." style="width: 100%; padding: 0.75rem; border: 1px solid #E5E7EB; border-radius: 0.75rem; font-size: 0.875rem; outline: none; resize: vertical;"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Post Reply',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white font-medium shadow-lg',
        cancelButton: 'px-6 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium'
      },
      buttonsStyling: false,
      preConfirm: () => {
        const input = document.getElementById('reply-input') as HTMLTextAreaElement;
        const val = input?.value.trim();
        if (!val) {
          Swal.showValidationMessage('Please enter your reply');
          return;
        }
        return val;
      }
    });
    if (!value) return;
    const fd = new FormData();
    fd.append('thread_id', thread_id);
    fd.append('content', value);
    const res = await addReply(fd);
    if ('error' in res) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Failed to post reply', 
        text: res.error,
        customClass: { popup: 'rounded-2xl' }
      });
    } else {
      await Swal.fire({ 
        icon: 'success', 
        title: 'Reply posted!', 
        timer: 1200,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' }
      });
    }
  };

  // Participants modal
  const showParticipants = async (s: Session) => {
    const res = await listParticipants(s.id);
    if ('error' in res) {
      Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      return;
    }
    const rows = res.data
      .map((p: ParticipantWithProfile) => `
        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: 0.5rem; background: #F9FAFB; margin-bottom: 0.5rem;">
          <div style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background: linear-gradient(135deg, #40BD46, #2E8B85); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.875rem;">
            ${(p.profile?.full_name || p.profile?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 500; color: #0F3D73;">${p.profile?.full_name || p.profile?.email || 'User'}</div>
            ${p.role ? `<div style="font-size: 0.75rem; color: #6B7280;">${p.role}</div>` : ''}
          </div>
        </div>
      `)
      .join('');
    Swal.fire({ 
      title: '<span style="color: #0F3D73; font-weight: 600;">Session Members</span>',
      html: `<div style="padding: 0 1rem;">${rows || '<p style="text-align: center; color: #6B7280; padding: 2rem;">No participants yet</p>'}</div>`, 
      width: 500,
      confirmButtonText: 'Close',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white font-medium shadow-lg'
      },
      buttonsStyling: false
    });
  };

  // Voting helpers (optimistic score update)
  const voteS = async (s: Session, v: 1 | -1) => {
    const res = await voteSession(s.id, v);
    if ('error' in res) return Swal.fire({ icon: 'error', title: 'Vote failed', text: res.error });
    setSessionScores(prev => ({ ...prev, [s.id]: (prev[s.id] || 0) + v }));
  };

  const voteT = async (t: Thread, v: 1 | -1) => {
    const res = await voteThread(t.id, v);
    if ('error' in res) return Swal.fire({ icon: 'error', title: 'Vote failed', text: res.error });
    setThreadScores(prev => ({ ...prev, [t.id]: (prev[t.id] || 0) + v }));
  };

  // Attachments manager
  const manageAttachments = async (kind: 'session'|'thread', target_id: string) => {
    const list = await listAttachments(kind, target_id);
    if ('error' in list) return Swal.fire({ icon: 'error', title: 'Load attachments failed', text: list.error });
    const items = (list.data as Array<{ id: string; name: string; url?: string | null }>)
      .map(a => `<div class=\"flex items-center justify-between\"><a class=\"text-[#3AAFA9] underline\" href=\"${a.url || '#'}\" target=\"_blank\">${a.name}</a><button data-id=\"${a.id}\" class=\"swal-del px-2 py-1 text-xs border rounded\">Delete</button></div>`) 
      .join('');

    const { value: file } = await Swal.fire<{ file: File } | null>({
      title: 'Attachments',
      html: `<div class=\"space-y-3 text-left\">${items || '<div class=\"text-sm text-[#6B7280]\">No attachments</div>'}<input id=\"file\" type=\"file\" class=\"swal2-file\"/></div>`,
      showCancelButton: true,
      didOpen: () => {
        document.querySelectorAll('.swal-del').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = (e.currentTarget as HTMLElement).getAttribute('data-id')!;
            const ok = await Swal.fire({ icon: 'warning', title: 'Delete attachment?', showCancelButton: true });
            if (!ok.isConfirmed) return;
            const r = await deleteAttachment(id);
            if ('error' in r) Swal.fire({ icon: 'error', title: 'Error', text: r.error });
            else Swal.fire({ icon: 'success', title: 'Deleted' });
          });
        });
      },
      preConfirm: () => {
        const inp = document.getElementById('file') as HTMLInputElement | null;
        if (inp?.files && inp.files[0]) return { file: inp.files[0] };
        return null;
      }
    });

    if (!file) return;
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('target_id', target_id);
    fd.append('file', file.file);
    const up = await uploadAttachment(fd);
    if ('error' in up) Swal.fire({ icon: 'error', title: 'Upload failed', text: up.error });
    else Swal.fire({ icon: 'success', title: 'Uploaded' });
  };

  if (loading) return <div className="text-[#6B7280]">Loading collaboration...</div>;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
          <button
            onClick={()=>setTab('planning')}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab==='planning'
                ? 'bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white shadow-md'
                : 'text-[#6B7280] hover:text-[#2E3A59] hover:bg-[#F9FAFB]'
            }`}
          >
            <span className="relative z-10">Group Planning</span>
          </button>
          <button
            onClick={()=>setTab('discuss')}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab==='discuss'
                ? 'bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white shadow-md'
                : 'text-[#6B7280] hover:text-[#2E3A59] hover:bg-[#F9FAFB]'
            }`}
          >
            <span className="relative z-10">Discussions</span>
          </button>
        </div>
        {tab==='planning' ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={newSession}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white font-medium shadow-lg shadow-[#40BD46]/25 hover:shadow-xl hover:shadow-[#40BD46]/30 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={newThread}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white font-medium shadow-lg shadow-[#40BD46]/25 hover:shadow-xl hover:shadow-[#40BD46]/30 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </motion.button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-4 lg:gap-6">
        <div className="space-y-4 lg:space-y-6">
          {tab === 'planning' ? (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <CalendarStrip />
              </div>
              <div className="flex items-center justify-between">
                <h2 className="text-base lg:text-lg font-semibold text-[#0F3D73]">Active Sessions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                {sessions.map(s => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className="group relative bg-white rounded-xl lg:rounded-2xl border border-[#E5E7EB] p-4 lg:p-5 hover:shadow-xl hover:border-[#40BD46]/30 transition-all duration-300"
                  >
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-[#E8F7E9] to-[#D4F4DD] text-[#15751A] border border-[#C9F0CC]">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                        </svg>
                        {s.visibility}
                      </span>
                    </div>
                    <div className="pr-16 lg:pr-20">
                      <h3 className="text-sm lg:text-base font-semibold text-[#0F3D73] mb-1 truncate">{s.title}</h3>
                      {s.description && <p className="text-xs lg:text-sm text-[#6B7280] line-clamp-2 mb-2 lg:mb-3">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 lg:gap-4 text-xs text-[#6B7280] mb-3 lg:mb-4">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{sessionScores[s.id] ?? 0}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 lg:gap-2">
                      {joined.has(s.id) ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={()=>router.push(`/collaboration/session/${s.id}`)}
                          className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white text-xs lg:text-sm font-medium shadow-md hover:shadow-lg transition-all"
                        >
                          Enter Room
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={()=>handleJoin(s)}
                          className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg bg-white border-2 border-[#40BD46] text-[#40BD46] text-xs lg:text-sm font-medium hover:bg-[#40BD46] hover:text-white transition-all"
                        >
                          Join
                        </motion.button>
                      )}
                      <button className="px-2 lg:px-3 py-1.5 lg:py-2 text-[10px] lg:text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition" onClick={()=>comment(s)}>Comment</button>
                      <button className="px-2 lg:px-3 py-1.5 lg:py-2 text-[10px] lg:text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition" onClick={()=>showParticipants(s)}>Members</button>
                      <button className="px-2 lg:px-3 py-1.5 lg:py-2 text-[10px] lg:text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition" onClick={()=>manageAttachments('session', s.id)}>Files</button>
                      <div className="ml-auto flex items-center gap-0.5 lg:gap-1">
                        <button title="Upvote" className="p-2 rounded-lg hover:bg-green-50 text-[#40BD46] transition" onClick={()=>voteS(s, 1)}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l6 6H4l6-6z"/></svg>
                        </button>
                        <button title="Downvote" className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition" onClick={()=>voteS(s, -1)}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-6-6h12l-6 6z"/></svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Pager page={sessionPage} totalPages={totalSessionPages} onPrev={()=>setSessionPage(p=>Math.max(1,p-1))} onNext={()=>setSessionPage(p=>Math.min(totalSessionPages,p+1))} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base lg:text-lg font-semibold text-[#0F3D73]">Discussion Threads</h2>
              </div>
              <div className="space-y-3 lg:space-y-4">
                {threads.map(t => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className="group bg-white rounded-xl lg:rounded-2xl border border-[#E5E7EB] p-4 lg:p-6 hover:shadow-xl hover:border-[#0F3D73]/20 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3 lg:gap-4 mb-3 lg:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm lg:text-base font-semibold text-[#0F3D73] mb-1 lg:mb-2">{t.title}</h3>
                        <p className="text-xs lg:text-sm text-[#4B5563] line-clamp-3 whitespace-pre-line">{t.content}</p>
                      </div>
                      <span className="shrink-0 px-2 lg:px-3 py-0.5 lg:py-1 text-[10px] lg:text-xs font-medium rounded-full bg-gradient-to-r from-[#EAF2FB] to-[#D6E7F7] text-[#0F3D73] border border-[#C8D7EA]">General</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 lg:gap-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={()=>reply(t.id)}
                          className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white text-xs lg:text-sm font-medium shadow-md hover:shadow-lg transition-all"
                        >
                          Reply
                        </motion.button>
                        <button className="px-2 lg:px-3 py-1.5 lg:py-2 text-[10px] lg:text-xs rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition" onClick={()=>manageAttachments('thread', t.id)}>Attachments</button>
                      </div>
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className="flex items-center gap-1 text-sm text-[#6B7280]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">{threadScores[t.id] ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button title="Upvote" className="p-2 rounded-lg hover:bg-green-50 text-[#40BD46] transition" onClick={()=>voteT(t, 1)}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l6 6H4l6-6z"/></svg>
                          </button>
                          <button title="Downvote" className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition" onClick={()=>voteT(t, -1)}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 17l-6-6h12l-6 6z"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Pager page={threadPage} totalPages={totalThreadPages} onPrev={()=>setThreadPage(p=>Math.max(1,p-1))} onNext={()=>setThreadPage(p=>Math.min(totalThreadPages,p+1))} />
            </div>
          )}
        </div>

        <aside className="hidden lg:flex flex-col gap-6 sticky top-8 h-fit">
          <div className="bg-gradient-to-br from-white to-[#F9FAFB] rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#40BD46] to-[#2E8B85] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#0F3D73]">Group Members</h3>
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed">Click Participants on any session to view and manage members in real-time.</p>
          </div>
          <div className="bg-gradient-to-br from-white to-[#F9FAFB] rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F3D73] to-[#2E3A59] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#0F3D73]">Shared Files</h3>
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed">Upload and manage files within sessions or threads using the Files button.</p>
          </div>
          <div className="bg-gradient-to-br from-[#E8F7E9] to-[#D4F4DD] rounded-2xl border border-[#C9F0CC] p-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-[#15751A]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <h4 className="text-sm font-semibold text-[#15751A]">Quick Tip</h4>
            </div>
            <p className="text-xs text-[#15751A]/80 leading-relaxed">Use voting to highlight valuable sessions and threads. Higher scores appear more prominently.</p>
          </div>
        </aside>
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={tab==='planning'?newSession:newThread}
        className="lg:hidden fixed right-6 bottom-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#40BD46] to-[#36aa3b] text-white shadow-2xl shadow-[#40BD46]/40 flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
        </svg>
      </motion.button>
    </div>
  );
}

// Simple pager component
function Pager({ page, totalPages, onPrev, onNext }: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button onClick={onPrev} disabled={page <= 1} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Prev</button>
      <span className="text-sm text-[#6B7280]">Page {page} of {totalPages}</span>
      <button onClick={onNext} disabled={page >= totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
    </div>
  );
}

// Simple calendar strip (Week view with quick month select)
function CalendarStrip() {
  const [base, setBase] = useState<Date>(() => new Date());
  const today = new Date();
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  const days = Array.from({ length: 7 }).map((_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const isToday = dt.toDateString() === today.toDateString();
    return { key: i, date: dt, isToday };
  });

  const prevWeek = () => {
    const d = new Date(base);
    d.setDate(d.getDate() - 7);
    setBase(d);
  };
  const nextWeek = () => {
    const d = new Date(base);
    d.setDate(d.getDate() + 7);
    setBase(d);
  };

  const onMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parts = e.target.value.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    setBase(d);
  };

  const ym = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
  const monthOptions = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - idx));
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return { value, label };
  });

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#0F3D73]">Week View</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition">
            <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <select value={ym} onChange={onMonthChange} className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BD46]">
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button onClick={nextWeek} className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] transition">
            <svg className="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d) => (
          <motion.div
            key={d.key}
            whileHover={{ scale: 1.05 }}
            className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
              d.isToday
                ? 'bg-gradient-to-br from-[#40BD46] to-[#36aa3b] border-[#40BD46] text-white shadow-lg'
                : 'bg-white border-[#E5E7EB] text-[#4B5563] hover:border-[#40BD46]/30 hover:shadow-md'
            }`}
            title={d.date.toDateString()}
          >
            <div className={`text-[10px] font-medium uppercase mb-1 ${d.isToday ? 'text-white/90' : 'text-[#6B7280]'}`}>
              {d.date.toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
            <div className={`text-lg font-bold ${d.isToday ? 'text-white' : 'text-[#0F3D73]'}`}>
              {d.date.getDate()}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
