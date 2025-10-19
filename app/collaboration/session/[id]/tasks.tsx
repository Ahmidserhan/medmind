'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  getSessionTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  getTaskComments,
  addTaskComment,
  type SharedTask,
  type TaskComment,
} from '@/app/actions/shared-tasks';

export default function SharedTasks({ sessionId, userId, participants }: { sessionId: string; userId: string; participants: Array<{ user_id: string; profile?: { full_name?: string; email?: string } }> }) {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({});
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadTasks = async () => {
    setLoading(true);
    const res = await getSessionTasks(sessionId);
    if ('data' in res && res.data) {
      setTasks(res.data);
    }
    setLoading(false);
  };

  const loadComments = async (taskId: string) => {
    const res = await getTaskComments(taskId);
    if ('data' in res && res.data) {
      setComments(prev => ({ ...prev, [taskId]: res.data }));
    }
  };

  const handleCreateTask = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Create New Task',
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-semibold mb-2">Title</label>
            <input id="title" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg" placeholder="Task title">
          </div>
          <div>
            <label class="block text-sm font-semibold mb-2">Description</label>
            <textarea id="description" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg" rows="3" placeholder="Task description"></textarea>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-2">Priority</label>
            <select id="priority" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-2">Assign To</label>
            <select id="assigned_to" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg">
              <option value="">Unassigned</option>
              ${participants.map(p => `<option value="${p.user_id}">${p.profile?.full_name || p.profile?.email || 'User'}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-2">Due Date</label>
            <input id="due_date" type="datetime-local" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      width: '600px',
      preConfirm: () => {
        const title = (document.getElementById('title') as HTMLInputElement).value;
        const description = (document.getElementById('description') as HTMLTextAreaElement).value;
        const priority = (document.getElementById('priority') as HTMLSelectElement).value;
        const assigned_to = (document.getElementById('assigned_to') as HTMLSelectElement).value;
        const due_date = (document.getElementById('due_date') as HTMLInputElement).value;
        
        if (!title) {
          Swal.showValidationMessage('Title is required');
          return false;
        }
        return { title, description, priority, assigned_to, due_date };
      }
    });

    if (formValues) {
      const formData = new FormData();
      formData.append('session_id', sessionId);
      formData.append('title', formValues.title);
      formData.append('description', formValues.description);
      formData.append('priority', formValues.priority);
      formData.append('assigned_to', formValues.assigned_to);
      formData.append('due_date', formValues.due_date);

      const res = await createTask(formData);
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      } else {
        setTasks([res.data, ...tasks]);
        Swal.fire({ icon: 'success', title: 'Task created!', timer: 1500 });
      }
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    const res = await updateTaskStatus(taskId, status);
    if ('error' in res) {
      Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    } else {
      setTasks(tasks.map(t => t.id === taskId ? res.data : t));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const result = await Swal.fire({
      title: 'Delete task?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete'
    });

    if (result.isConfirmed) {
      const res = await deleteTask(taskId);
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      } else {
        setTasks(tasks.filter(t => t.id !== taskId));
        Swal.fire({ icon: 'success', title: 'Task deleted!', timer: 1500 });
      }
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!commentText.trim()) return;

    const res = await addTaskComment(taskId, commentText);
    if ('error' in res) {
      Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    } else {
      setComments(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), res.data]
      }));
      setCommentText('');
    }
  };

  const toggleTaskDetails = (taskId: string) => {
    if (selectedTask === taskId) {
      setSelectedTask(null);
    } else {
      setSelectedTask(taskId);
      if (!comments[taskId]) {
        loadComments(taskId);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#0F3D73]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Shared Tasks</h3>
        <button
          onClick={handleCreateTask}
          className="px-4 py-2 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl hover:shadow-lg font-semibold transition-all shadow-md flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="font-medium text-gray-600">No tasks yet</p>
          <p className="text-sm text-gray-500 mt-1">Create your first task to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const assignedUser = participants.find(p => p.user_id === task.assigned_to);
            const assignedName = assignedUser?.profile?.full_name || assignedUser?.profile?.email || 'Unassigned';
            
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-[#0F3D73] transition-all"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleStatusChange(task.id, task.status === 'completed' ? 'pending' : task.status === 'in_progress' ? 'completed' : 'in_progress')}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 ${getStatusColor(task.status)} ${task.status === 'completed' ? '' : 'border-gray-300'} flex items-center justify-center transition-all`}
                    >
                      {task.status === 'completed' && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className={`font-semibold text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{assignedName}</span>
                        </div>
                        
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        <button
                          onClick={() => toggleTaskDetails(task.id)}
                          className="flex items-center gap-1 hover:text-[#0F3D73] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{comments[task.id]?.length || 0} comments</span>
                        </button>
                        
                        {task.created_by === userId && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="ml-auto text-red-600 hover:text-red-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedTask === task.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                      {comments[task.id]?.map((comment) => (
                        <div key={comment.id} className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-900">{comment.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(task.id)}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D73]"
                      />
                      <button
                        onClick={() => handleAddComment(task.id)}
                        className="px-4 py-2 bg-[#0F3D73] text-white rounded-lg hover:bg-[#0B2F59] transition-colors text-sm font-medium"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
