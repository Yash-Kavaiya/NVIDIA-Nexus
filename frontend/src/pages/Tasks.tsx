import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store';
import { taskApi } from '../services/api';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function Tasks() {
  const queryClient = useQueryClient();
  const { setActiveTask, toggleTaskPanel, addToast } = useStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: taskApi.getTasks,
    refetchInterval: 5000 // Poll every 5 seconds for updates
  });

  // Task mutations
  const pauseMutation = useMutation({
    mutationFn: taskApi.pauseTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast('success', 'Task paused');
    }
  });

  const resumeMutation = useMutation({
    mutationFn: taskApi.resumeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast('success', 'Task resumed');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: taskApi.cancelTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast('success', 'Task cancelled');
    }
  });

  const seedMutation = useMutation({
    mutationFn: taskApi.seedDemoTasks,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast('success', `Created ${data.count} demo tasks`);
    },
    onError: () => {
      addToast('error', 'Failed to seed demo tasks');
    }
  });

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'planning', 'executing', 'paused'].includes(task.status);
    if (filter === 'completed') return ['completed', 'failed'].includes(task.status);
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-nvidia-green" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'executing':
        return <Clock className="w-5 h-5 text-nvidia-green-bright animate-spin p-0.5" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-nvidia-text-secondary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-nvidia-green/10 text-nvidia-green border-nvidia-green/20';
      case 'failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'executing': return 'bg-nvidia-green/10 text-nvidia-green-bright border-nvidia-green/20';
      case 'paused': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-nvidia-gray text-nvidia-text-secondary border-nvidia-gray-light';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-nvidia-text-secondary mt-1">
            Manage and monitor your AI-powered file operations
          </p>
        </div>

        <div className="flex gap-2">
          {['all', 'active', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                ? 'bg-nvidia-green text-nvidia-black'
                : 'bg-nvidia-gray hover:bg-nvidia-gray-light text-nvidia-text-secondary'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
            className="p-2 rounded-lg bg-nvidia-gray hover:bg-nvidia-gray-light text-nvidia-text-secondary transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="px-4 py-2 rounded-lg bg-nvidia-green text-nvidia-black text-sm font-medium hover:bg-nvidia-green-bright transition-colors disabled:opacity-50"
          >
            {seedMutation.isPending ? 'Seeding...' : '+ Demo Tasks'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nvidia-green" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-nvidia-text-secondary bg-nvidia-gray/10 rounded-xl border border-dashed border-nvidia-gray-light">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No tasks found</p>
            <p className="text-sm">Tasks will appear here when you perform file operations</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="nvidia-card p-0 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{task.title}</h3>
                      <p className="text-nvidia-text-secondary text-sm">{task.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {task.status === 'executing' && (
                      <button
                        onClick={() => pauseMutation.mutate(task.id)}
                        className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors text-yellow-500"
                        title="Pause Task"
                      >
                        <Pause className="w-5 h-5" />
                      </button>
                    )}
                    {task.status === 'paused' && (
                      <button
                        onClick={() => resumeMutation.mutate(task.id)}
                        className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors text-nvidia-green"
                        title="Resume Task"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                    )}
                    {['planning', 'pending', 'executing', 'paused'].includes(task.status) && (
                      <button
                        onClick={() => cancelMutation.mutate(task.id)}
                        className="p-2 rounded-lg hover:bg-nvidia-gray transition-colors text-red-500"
                        title="Cancel Task"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-nvidia-text-secondary">Progress</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <div className="h-2 bg-nvidia-gray rounded-full overflow-hidden">
                    <div
                      className="h-full bg-nvidia-green transition-all duration-500 ease-out"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-nvidia-text-secondary pt-4 border-t border-nvidia-gray-light">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Started {formatDistanceToNow(new Date(task.createdAt))} ago
                    </span>
                    {task.completedAt && (
                      <span>
                        Completed in {formatDistanceToNow(new Date(task.completedAt))}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setActiveTask(task);
                      toggleTaskPanel();
                    }}
                    className="text-nvidia-green hover:underline cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
