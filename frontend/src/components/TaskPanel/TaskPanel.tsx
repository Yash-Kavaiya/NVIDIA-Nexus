import { useStore } from '../../store';
import { X, Play, Pause, Square, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function TaskPanel() {
  const { tasks, activeTask, toggleTaskPanel } = useStore();

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

  const handlePauseResume = (taskId: string, currentStatus: string) => {
    // This would call the API in a real implementation
    console.log(`${currentStatus === 'paused' ? 'Resume' : 'Pause'} task ${taskId}`);
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
            {activeTask.steps.map((step) => (
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
                onClick={() => handlePauseResume(activeTask.id, activeTask.status)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-nvidia-gray rounded-lg text-sm hover:bg-nvidia-gray-light transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            ) : activeTask.status === 'paused' ? (
              <button
                onClick={() => handlePauseResume(activeTask.id, activeTask.status)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-nvidia-green text-nvidia-black rounded-lg text-sm hover:bg-nvidia-green-bright transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            ) : null}

            <button className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
              <Square className="w-4 h-4" />
              Cancel
            </button>
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
              className="p-3 rounded-lg bg-nvidia-gray/50 border border-nvidia-gray-light hover:border-nvidia-green/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                {getStatusIcon(task.status)}
                <span className="text-sm font-medium truncate">{task.title}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-nvidia-text-secondary">
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
