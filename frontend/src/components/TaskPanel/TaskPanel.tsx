import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store';
import { taskApi } from '../../services/api';
import { X, Play, Pause, Square, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function TaskPanel() {
  const queryClient = useQueryClient();
  const { activeTask, setActiveTask, toggleTaskPanel } = useStore();

  // Fetch tasks with React Query (synced with Tasks page)
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: taskApi.getTasks,
    refetchInterval: 5000
  });

  // Mutations for task actions
  const pauseMutation = useMutation({
    mutationFn: taskApi.pauseTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const resumeMutation = useMutation({
    mutationFn: taskApi.resumeTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const cancelMutation = useMutation({
    mutationFn: taskApi.cancelTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setActiveTask(null);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-nvidia-green" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'executing':
        return <Clock className="w-5 h-5 text-nvidia-green-bright animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-nvidia-text-secondary" />;
    }
  };

  const handlePause = (taskId: string) => {
    pauseMutation.mutate(taskId);
  };

  const handleResume = (taskId: string) => {
    resumeMutation.mutate(taskId);
  };

  const handleCancel = (taskId: string) => {
    cancelMutation.mutate(taskId);
  };

  return (
    <aside className="w-80 bg-nvidia-dark border-l border-nvidia-gray-light flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-nvidia-gray-light flex items-center justify-between px-4">
        <h2 className="font-semibold text-nvidia-white">Active Tasks</h2>
        <button
          onClick={toggleTaskPanel}
          className="p-1 rounded hover:bg-nvidia-gray transition-colors"
        >
          <X className="w-5 h-5 text-nvidia-text-secondary" />
        </button>
      </div>

      {/* Active Task Detail */}
      {activeTask && (
        <div className="p-4 border-b border-nvidia-gray-light bg-nvidia-gray/30">
          <div className="flex items-center gap-2 mb-3">
            {getStatusIcon(activeTask.status)}
            <span className="font-medium text-sm">{activeTask.title}</span>
          </div>

          <p className="text-xs text-nvidia-text-secondary mb-3">{activeTask.description}</p>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-nvidia-text-secondary">Progress</span>
              <span className="text-nvidia-green font-semibold">{activeTask.progress}%</span>
            </div>
            <div className="h-2 bg-nvidia-gray rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-nvidia-green to-nvidia-green-bright transition-all duration-500"
                style={{ width: `${activeTask.progress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {activeTask.steps?.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${step.status === 'completed' ? 'bg-nvidia-green' :
                    step.status === 'in_progress' ? 'bg-nvidia-green-bright animate-pulse' :
                      step.status === 'failed' ? 'bg-red-500' :
                        'bg-nvidia-gray-light'
                  }`} />
                <span className={step.status === 'completed' ? 'text-nvidia-text-secondary line-through' : ''}>
                  {step.description}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {activeTask.status === 'executing' ? (
              <button
                onClick={() => handlePause(activeTask.id)}
                disabled={pauseMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-nvidia-gray rounded-lg text-sm hover:bg-nvidia-gray-light transition-colors disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                {pauseMutation.isPending ? 'Pausing...' : 'Pause'}
              </button>
            ) : activeTask.status === 'paused' ? (
              <button
                onClick={() => handleResume(activeTask.id)}
                disabled={resumeMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-nvidia-green text-nvidia-black rounded-lg text-sm hover:bg-nvidia-green-bright transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {resumeMutation.isPending ? 'Resuming...' : 'Resume'}
              </button>
            ) : null}

            {['planning', 'pending', 'executing', 'paused'].includes(activeTask.status) && (
              <button
                onClick={() => handleCancel(activeTask.id)}
                disabled={cancelMutation.isPending}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-nvidia-text-secondary uppercase tracking-wider mb-3">
          Recent Tasks
        </h3>

        <div className="space-y-2">
          {tasks.filter(t => t.id !== activeTask?.id).map((task) => (
            <div
              key={task.id}
              onClick={() => setActiveTask(task)}
              className="p-3 rounded-lg bg-nvidia-gray/50 border border-nvidia-gray-light hover:border-nvidia-green/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(task.status)}
                <span className="text-sm font-medium truncate">{task.title}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-nvidia-gray rounded-full overflow-hidden mt-2 mb-1">
                <div
                  className="h-full bg-gradient-to-r from-nvidia-green to-nvidia-green-bright transition-all duration-500"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              {/* Step dots */}
              {task.steps && task.steps.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5">
                  {task.steps.map((step: any) => (
                    <div
                      key={step.id}
                      title={step.description}
                      className={`w-2 h-2 rounded-full ${
                        step.status === 'completed' ? 'bg-nvidia-green' :
                        step.status === 'in_progress' ? 'bg-nvidia-green-bright animate-pulse' :
                        step.status === 'failed' ? 'bg-red-500' :
                        'bg-nvidia-gray-light'
                      }`}
                    />
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-nvidia-text-secondary mt-1">
                <span>{task.progress}% complete</span>
                <span>{new Date(task.updatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-8 text-nvidia-text-secondary text-sm">
              No tasks yet. Start by organizing files or chatting with the AI.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
