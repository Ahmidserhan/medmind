"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { createClient } from "@/lib/supabase/client";
import { uploadCollabFile, getCollabFiles, deleteCollabFile, type CollabAttachment } from "@/app/actions/collab-files";
import { addReaction, removeReaction, sendImageMessage, type MessageReaction } from "@/app/actions/collab-reactions";
import SharedTasks from "./tasks";

// Safe UUID generator: uses crypto.randomUUID if available, else polyfills
function safeRandomUUID(): string {
  const c: Crypto | undefined = (typeof globalThis !== 'undefined' && 'crypto' in globalThis)
    ? (globalThis.crypto as Crypto)
    : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    // Per RFC4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const b = Array.from(bytes, toHex).join('');
    return `${b.substring(0, 8)}-${b.substring(8, 12)}-${b.substring(12, 16)}-${b.substring(16, 20)}-${b.substring(20)}`;
  }
  // Non-crypto fallback (last resort)
  let d = new Date().getTime();
  let d2 = (typeof performance !== 'undefined' && performance.now) ? Math.floor(performance.now() * 1000) : 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    let r = Math.random() * 16;
    if (d > 0) { r = (d + r) % 16 | 0; d = Math.floor(d / 16); }
    else { r = (d2 + r) % 16 | 0; d2 = Math.floor(d2 / 16); }
    return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

type DbMessage = {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  image_path?: string | null;
  created_at: string;
};

type TypingUser = {
  user_id: string;
  name: string;
};

type Participant = {
  user_id: string;
  profile?: {
    full_name?: string;
    email?: string;
  };
};

export default function SessionRoom({ sessionId, title, userId: propUserId, displayName }: { sessionId: string; title: string; userId: string; displayName: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [text, setText] = useState("");
  const [userId] = useState<string>(propUserId);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [readBy, setReadBy] = useState<Record<string, string[]>>({});
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<Record<string, number>>({});
  const [profileCache, setProfileCache] = useState<Record<string, { full_name?: string; email?: string }>>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [attachments, setAttachments] = useState<CollabAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'members' | 'files' | 'tasks'>('members');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<DbMessage[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Types for realtime payloads and DB rows we access
  type ProfilesRow = { id: string; full_name: string | null; email: string | null };
  type PartRow = { user_id: string };
  type InsertPayload<T> = { new: T };
  type BroadcastTyping = { user_id: string; name: string };
  type BroadcastRead = { message_id: string; user_id: string };

  // Map user_id -> display name (current user + fetched participants)
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    if (userId && displayName) map.set(userId, displayName);
    // Cached profiles
    Object.entries(profileCache).forEach(([id, p]) => {
      const name = p.full_name || p.email?.split('@')[0];
      if (name) map.set(id, name);
    });
    participants.forEach(p => {
      const name = p.profile?.full_name || p.profile?.email?.split('@')[0];
      if (name) map.set(p.user_id, name);
    });
    return map;
  }, [participants, userId, displayName, profileCache]);

  // Fetch profiles for any user IDs appearing in messages/participants that are missing from cache/map
  useEffect(() => {
    const wantIds = new Set<string>();
    participants.forEach(p => wantIds.add(p.user_id));
    messagesRef.current.forEach(m => wantIds.add(m.user_id));
    if (userId) wantIds.add(userId);
    const missing = Array.from(wantIds).filter(id => !nameById.has(id));
    if (missing.length === 0) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', missing);
      if (error) {
        console.warn('Profile fetch skipped/failed (RLS?)', error);
        return;
      }
      const next: Record<string, { full_name?: string; email?: string }> = {};
      (data || []).forEach((p: ProfilesRow) => {
        next[p.id] = { full_name: p.full_name ?? undefined, email: p.email ?? undefined };
      });
      if (Object.keys(next).length > 0) {
        setProfileCache(prev => ({ ...prev, ...next }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, messages]);

  // Load files
  useEffect(() => {
    (async () => {
      const res = await getCollabFiles(sessionId);
      if ('data' in res && res.data) {
        setAttachments(res.data);
      }
    })();
  }, [sessionId]);

  // Load reactions for all messages
  useEffect(() => {
    if (messages.length === 0) return;
    
    (async () => {
      const { data, error } = await supabase
        .from('collab_message_reactions')
        .select('*')
        .in('message_id', messages.map(m => m.id));
      
      if (!error && data) {
        const grouped = data.reduce((acc, reaction) => {
          if (!acc[reaction.message_id]) acc[reaction.message_id] = [];
          acc[reaction.message_id].push(reaction);
          return acc;
        }, {} as Record<string, MessageReaction[]>);
        setReactions(grouped);
      }
    })();
  }, [messages, supabase]);

  // Load history and subscribe
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;
    
    (async () => {
      console.log('🚀 Initializing room subscription for session:', sessionId);
      
      const [msgRes, partRes] = await Promise.all([
        supabase
          .from('collab_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true }),
        supabase
          .from('collab_session_participants')
          .select('user_id')
          .eq('session_id', sessionId)
      ]);
      
      if (!mounted) return;
      
      console.log('📨 Loaded messages:', msgRes.data?.length || 0);
      console.log('👥 Loaded participants:', partRes.data?.length || 0);
      
      const initialMessages = (msgRes.data as DbMessage[]) || [];
      setMessages(initialMessages);
      messagesRef.current = initialMessages;
      
      if (partRes.data && partRes.data.length > 0) {
        const userIds = (partRes.data as PartRow[]).map((p) => p.user_id);
        
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (profileError) {
          console.warn('⚠️ Failed to fetch profiles:', profileError);
        }
        
        const profileMap = new Map((profilesData || []).map((p: ProfilesRow) => [
          p.id,
          { full_name: (p.full_name ?? undefined), email: (p.email ?? undefined) } as { full_name?: string; email?: string }
        ]));
        const mappedParticipants = (partRes.data as PartRow[]).map((p) => ({
          user_id: p.user_id,
          profile: profileMap.get(p.user_id)
        }));
        
        if (!mounted) return;
        setParticipants(mappedParticipants);
      }

      console.log('🔌 Setting up realtime channel...');
      
      const ch = supabase
        .channel(`room:${sessionId}`, {
          config: {
            presence: {
              key: userId,
            },
            broadcast: {
              self: false,
            },
          },
        });

      channel = ch
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'collab_messages', filter: `session_id=eq.${sessionId}` },
          (payload: InsertPayload<DbMessage>) => {
            console.log('📩 New message received:', payload.new);
            const incoming = payload.new as DbMessage;
            
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(m => m.id === incoming.id)) {
                console.log('⚠️ Duplicate message, skipping');
                return prev;
              }
              
              // Try to replace optimistic message
              const tempIdx = prev.findIndex(m => 
                m.id.startsWith('temp-') && 
                m.user_id === incoming.user_id && 
                m.content === incoming.content
              );
              
              if (tempIdx >= 0) {
                console.log('✅ Replacing optimistic message');
                const next = [...prev];
                next[tempIdx] = incoming;
                messagesRef.current = next;
                return next;
              }
              
              // Add new message
              console.log('✨ Adding new message');
              const next = [...prev, incoming];
              messagesRef.current = next;
              return next;
            });
            
            // Update last seen for sender
            setLastSeen(prev => ({ ...prev, [incoming.user_id]: new Date(incoming.created_at).getTime() }));
          }
        )
        // @ts-expect-error: Supabase realtime .on overload types don't include 'broadcast' in this version, runtime is valid
        .on('broadcast', { event: 'typing' }, (payload: { event: 'typing'; payload: BroadcastTyping }) => {
          console.log('⌨️ Typing event:', payload.payload);
          if (payload.payload.user_id === userId) return;
          setTypingUsers(prev => {
            const exists = prev.find(u => u.user_id === payload.payload.user_id);
            if (exists) return prev;
            return [...prev, { user_id: payload.payload.user_id, name: payload.payload.name }];
          });
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.user_id !== payload.payload.user_id));
          }, 3000);
        })
        // @ts-expect-error: Supabase realtime .on overload types don't include 'broadcast' in this version, runtime is valid
        .on('broadcast', { event: 'read' }, (payload: { event: 'read'; payload: BroadcastRead }) => {
          const { message_id, user_id: readerId } = payload.payload;
          setReadBy(prev => ({
            ...prev,
            [message_id]: [...(prev[message_id] || []), readerId].filter((v, i, a) => a.indexOf(v) === i)
          }));
        })
        .on('presence', { event: 'sync' }, () => {
          if (!channel) return;
          const state = channel.presenceState();
          const ids = new Set<string>();
          Object.values(state).forEach((metas: unknown) => {
            const arr = metas as Array<{ user_id?: string }>;
            if (Array.isArray(arr) && arr[0]?.user_id) ids.add(arr[0].user_id);
          });
          setOnlineIds(ids);
          const now = Date.now();
          // refresh lastSeen for currently online users
          setLastSeen(prev => {
            const next = { ...prev } as Record<string, number>;
            ids.forEach(id => { next[id] = now; });
            return next;
          });
        })
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'collab_session_participants', filter: `session_id=eq.${sessionId}` },
          async (payload: InsertPayload<{ user_id: string }>) => {
            const newUserId = payload.new.user_id;
            if (participants.some(p => p.user_id === newUserId)) return;
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', newUserId)
              .single();
            setParticipants(prev => [...prev, {
              user_id: newUserId,
              profile: profileData ? {
                full_name: (profileData as { full_name?: string | null }).full_name ?? undefined,
                email: (profileData as { email?: string | null }).email ?? undefined,
              } : undefined
            }]);
          }
        )
        // @ts-expect-error: Supabase realtime .on overload types for 'postgres_changes' may not match, runtime is valid
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'collab_session_participants', filter: `session_id=eq.${sessionId}` },
          (payload: { old: { user_id: string } }) => {
            const leftUserId = payload.old.user_id;
            setParticipants(prev => prev.filter(p => p.user_id !== leftUserId));
          }
        )
   
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'collab_message_reactions' },
          (payload: InsertPayload<MessageReaction>) => {
            const reaction = payload.new as MessageReaction;
            console.log('👍 New reaction:', reaction);
            setReactions(prev => {
              const existing = prev[reaction.message_id]?.find(r => r.id === reaction.id);
              if (existing) {
                console.log('⚠️ Duplicate reaction, skipping');
                return prev;
              }
              return {
                ...prev,
                [reaction.message_id]: [...(prev[reaction.message_id] || []), reaction]
              };
            });
          }
        )
        // @ts-expect-error: Supabase realtime .on overload types for 'postgres_changes' may not match, runtime is valid
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'collab_message_reactions' },
          (payload: { old: MessageReaction }) => {
            const reaction = payload.old;
            console.log('👎 Reaction removed:', reaction);
            setReactions(prev => ({
              ...prev,
              [reaction.message_id]: (prev[reaction.message_id] || []).filter(
                r => !(r.id === reaction.id)
              )
            }));
          }
        )
        .subscribe(async (status) => {
          console.log('🔔 Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to realtime channel!');
            if (!mounted) return;
            setIsSubscribed(true);
            if (channel) {
              await channel.track({
                user_id: userId,
                name: displayName,
                online_at: new Date().toISOString(),
              });
              console.log('👋 Presence tracked');
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('❌ Subscription failed:', status);
            setIsSubscribed(false);
          }
        });

      channelRef.current = channel;
    })();

    return () => {
      console.log('🧹 Cleaning up subscription');
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsSubscribed(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId, displayName, supabase]);

  // Auto-scroll on new message
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    messagesRef.current = messages;
  }, [messages]);

  // Tick every 30s to refresh "active Xm ago" computations
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    
    console.log('📤 Sending message:', content);
    setText("");
    
    const temp: DbMessage = {
      id: `temp-${safeRandomUUID()}`,
      session_id: sessionId,
      user_id: userId || 'me',
      content,
      created_at: new Date().toISOString(),
    };
    
    // Optimistic add
    setMessages(prev => {
      const next = [...prev, temp];
      messagesRef.current = next;
      return next;
    });

    const { data: inserted, error } = await supabase
      .from('collab_messages')
      .insert({ session_id: sessionId, user_id: userId, content })
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Send failed:', error);
      // Rollback optimistic
      setMessages(prev => {
        const rolled = prev.filter(m => m.id !== temp.id);
        messagesRef.current = rolled;
        return rolled;
      });
      Swal.fire({ icon: 'error', title: 'Send failed', text: error.message });
    } else if (inserted) {
      console.log('✅ Message sent successfully');
      // The realtime listener will handle replacing the optimistic message
    }
  };

  const copyInvite = async () => {
    try {
      const url = `${location.origin}/collaboration/session/${sessionId}`;
      await navigator.clipboard.writeText(url);
      Swal.fire({ icon: "success", title: "Invite link copied" , timer: 1000, showConfirmButton: false});
    } catch {
      Swal.fire({ icon: "error", title: "Failed to copy" });
    }
  };

  const handleTyping = () => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId, name: displayName } as BroadcastTyping,
    });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (e.target.value.trim()) {
      handleTyping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'File too large', text: 'Maximum file size is 50MB' });
      return;
    }

    setUploading(true);
    Swal.fire({ title: 'Uploading...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = new FormData();
    formData.append('file', file);

    const res = await uploadCollabFile(sessionId, formData);

    if ('error' in res) {
      Swal.fire({ icon: 'error', title: 'Upload failed', text: res.error });
    } else {
      setAttachments(prev => [res.data, ...prev]);
      Swal.fire({ icon: 'success', title: 'File uploaded!', timer: 1500 });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteFile = async (id: string, storagePath: string) => {
    const result = await Swal.fire({
      title: 'Delete file?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete'
    });

    if (result.isConfirmed) {
      const res = await deleteCollabFile(id, storagePath);
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Delete failed', text: res.error });
      } else {
        setAttachments(prev => prev.filter(a => a.id !== id));
        Swal.fire({ icon: 'success', title: 'File deleted!', timer: 1500 });
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire({ icon: 'error', title: 'Image too large', text: 'Maximum image size is 10MB' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Please select an image file' });
      return;
    }

    setUploading(true);
    Swal.fire({ title: 'Sending image...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const formData = new FormData();
    formData.append('image', file);
    formData.append('content', text || '');

    const res = await sendImageMessage(sessionId, formData);

    if ('error' in res) {
      Swal.fire({ icon: 'error', title: 'Send failed', text: res.error });
    } else {
      setText('');
      Swal.close();
    }

    setUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const existing = reactions[messageId]?.find(r => r.user_id === userId && r.emoji === emoji);
    
    if (existing) {
      const res = await removeReaction(messageId, emoji);
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error, timer: 2000 });
      }
      // Don't update local state - let realtime handle it
    } else {
      const res = await addReaction(messageId, emoji);
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error, timer: 2000 });
      }
      // Don't update local state - let realtime handle it
    }
    setShowEmojiPicker(null);
  };

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

  const markAsRead = useMemo(() => {
    return (messageId: string) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'read',
        payload: { message_id: messageId, user_id: userId } as BroadcastRead,
      });
    };
  }, [channelRef, userId]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.user_id !== userId) {
        markAsRead(lastMsg.id);
      }
    }
  }, [messages, markAsRead, userId]);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-4 sm:gap-6">
      <div className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden h-full">
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-white via-gray-50 to-white">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#0F3D73] via-[#1a4d7f] to-[#2E3A59] flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg font-bold text-[#0F3D73] truncate">{title}</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSubscribed ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></div>
                <div className="text-xs font-medium text-gray-600">
                  {isSubscribed ? 'Live' : 'Connecting...'}
                </div>
                {isSubscribed && participants.length > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500">{participants.length} {participants.length === 1 ? 'member' : 'members'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyInvite}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-all shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="hidden sm:inline">Invite</span>
          </motion.button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-gradient-to-b from-gray-50 via-white to-gray-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#0F3D73]/10 rounded-full blur-2xl"></div>
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#E6EEF8] via-[#DCE8F5] to-[#D0E3F3] flex items-center justify-center mb-6 shadow-lg">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#0F3D73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900 mb-2">No messages yet</p>
              <p className="text-sm text-gray-500 max-w-xs">Start the conversation by sending the first message to your team</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.user_id === userId;
              const reads = readBy[m.id] || [];
              const readCount = reads.filter(id => id !== userId).length;
              const senderName = nameById.get(m.user_id) || (m.user_id?.slice(0,8) || 'User');
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] sm:max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                    {!mine && (
                      <div className="flex items-center gap-2 px-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0F3D73] via-[#1a4d7f] to-[#2E3A59] flex items-center justify-center text-white text-xs font-bold shadow-md">
                          {senderName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{senderName}</span>
                      </div>
                    )}
                    <div className="relative group">
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-md transition-all hover:shadow-lg ${
                          mine
                            ? 'bg-gradient-to-br from-[#0F3D73] via-[#1a4d7f] to-[#2E3A59] text-white rounded-br-md'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        {m.image_url && (
                          <div className="mb-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={m.image_url} 
                              alt="Shared image" 
                              className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(m.image_url!, '_blank')}
                            />
                          </div>
                        )}
                        {m.content && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>}
                      </div>
                      
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id)}
                        className={`absolute ${mine ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100`}
                        title="Add reaction"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>

                      {showEmojiPicker === m.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`absolute ${mine ? 'left-0' : 'right-0'} top-full mt-2 p-2 bg-white rounded-xl shadow-xl border border-gray-200 flex gap-1 z-10`}
                        >
                          {commonEmojis.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(m.id, emoji)}
                              className="text-xl hover:scale-125 transition-transform p-1"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}

                      {reactions[m.id] && reactions[m.id].length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(
                            reactions[m.id].reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([emoji, count]) => {
                            const userReacted = reactions[m.id].some(r => r.emoji === emoji && r.user_id === userId);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(m.id, emoji)}
                                className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-all ${
                                  userReacted
                                    ? 'bg-blue-100 border-2 border-blue-500'
                                    : 'bg-gray-100 border border-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-semibold">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 px-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className={`text-[10px] font-medium ${mine ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {mine && readCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50">
                          <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          </svg>
                          <span className="text-[10px] text-blue-600 font-semibold">Seen by {readCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-2"
            >
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-200 shadow-sm">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full bg-gradient-to-br from-[#0F3D73] to-[#2E3A59]"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full bg-gradient-to-br from-[#0F3D73] to-[#2E3A59]"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full bg-gradient-to-br from-[#0F3D73] to-[#2E3A59]"
                  />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="shrink-0 p-4 sm:p-5 border-t border-gray-200 bg-gradient-to-r from-white via-gray-50 to-white">
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <textarea
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type your message..."
                className="w-full resize-none rounded-xl border-2 border-gray-200 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] transition-all bg-white shadow-sm"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={uploading}
              />
              <div className="absolute right-2 bottom-2 flex gap-1">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={send}
              disabled={!text.trim()}
              className="px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#0F3D73] via-[#1a4d7f] to-[#2E3A59] text-white font-semibold shadow-lg shadow-[#0F3D73]/30 hover:shadow-xl hover:shadow-[#0F3D73]/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </motion.button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Press Enter to send, Shift + Enter for new line</span>
          </div>
        </div>
      </div>

      <aside className="hidden lg:flex flex-col h-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col h-full">
          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setSidebarTab('members')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                sidebarTab === 'members'
                  ? 'text-[#0F3D73] border-b-2 border-[#0F3D73] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setSidebarTab('tasks')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                sidebarTab === 'tasks'
                  ? 'text-[#0F3D73] border-b-2 border-[#0F3D73] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setSidebarTab('files')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                sidebarTab === 'files'
                  ? 'text-[#0F3D73] border-b-2 border-[#0F3D73] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Files
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            {sidebarTab === 'members' && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F3D73] via-[#1a4d7f] to-[#2E3A59] flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-900">Team Members</h3>
                    <p className="text-xs text-gray-500">{participants.length} online</p>
                  </div>
                </div>
                <div className="space-y-2">
            {participants.map((p) => {
              const isMe = p.user_id === userId;
              const name = isMe ? displayName : (p.profile?.full_name || p.profile?.email?.split('@')[0] || 'User');
              const initial = name.charAt(0).toUpperCase();
              const last = lastSeen[p.user_id] || 0;
              const isOnline = onlineIds.has(p.user_id) || (last > 0 && (nowTick - last) <= 5 * 60 * 1000);
              const minutesAgo = last > 0 ? Math.max(0, Math.floor((nowTick - last) / 60000)) : null;
              return (
                <div key={p.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group">
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${
                      isMe ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-[#0F3D73] via-[#1a4d7f] to-[#2E3A59]'
                    }`}>
                      {initial}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                      {name}
                      {isMe && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">YOU</span>}
                    </div>
                    {!isMe && !isOnline && minutesAgo !== null && (
                      <div className="text-[10px] text-gray-500 font-medium">Active {minutesAgo === 0 ? '<1' : minutesAgo}m ago</div>
                    )}
                    {!isMe && isOnline && (
                      <div className="text-[10px] text-emerald-600 font-semibold">Online now</div>
                    )}
                  </div>
                </div>
              );
            })}
                </div>
              </div>
            )}

            {sidebarTab === 'tasks' && (
              <SharedTasks sessionId={sessionId} userId={userId} participants={participants} />
            )}

            {sidebarTab === 'files' && (
              <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900">Shared Files</h3>
              <p className="text-xs text-blue-700">{attachments.length} {attachments.length === 1 ? 'file' : 'files'}</p>
            </div>
          </div>
          
          {attachments.length === 0 ? (
            <div className="flex items-center justify-center py-8 border-2 border-dashed border-blue-300 rounded-xl bg-white/50">
              <div className="text-center">
                <svg className="w-10 h-10 text-blue-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xs text-blue-600 font-medium mb-1">No files yet</p>
                <p className="text-xs text-blue-500">Use the attachment button to upload</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1">
              {attachments.map((file) => {
                const isImage = file.file_type?.startsWith('image/') || false;
                const isPDF = file.file_type === 'application/pdf';
                const uploaderName = nameById.get(file.user_id) || 'User';
                
                return (
                  <div key={file.id} className="p-3 bg-white rounded-xl border border-blue-200 hover:border-blue-400 transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-md">
                        {isImage ? (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : isPDF ? (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{file.name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{file.file_size ? formatFileSize(file.file_size) : 'Unknown size'}</div>
                        <div className="text-xs text-blue-600 mt-1">By {uploaderName}</div>
                      </div>
                      <div className="flex gap-1">
                        <a
                          href={file.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-all"
                          title="Download"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                        {file.user_id === userId && (
                          <button
                            onClick={() => handleDeleteFile(file.id, file.path)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 transition-all"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
