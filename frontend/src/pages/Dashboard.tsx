import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { chatApi } from '../services/api';
import {
  FolderOpen,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Zap,
  ListTodo
} from 'lucide-react';
import { AnimatedCounter } from '../components/UI/AnimatedCounter';
import { StaggerContainer, StaggerItem } from '../components/UI/StaggerContainer';
import GlowEffect from '../components/UI/GlowEffect';

export default function Dashboard() {
  const { files, tasks } = useStore();
  const navigate = useNavigate();
  const [conversationCount, setConversationCount] = useState(0);

  useEffect(() => {
    chatApi.getConversations().then((data) => {
      setConversationCount(Array.isArray(data) ? data.length : 0);
    }).catch(() => {});
  }, []);

  const activeTasks = tasks.filter(t => t.status === 'executing' || t.status === 'pending').length;

  const stats = [
    {
      label: 'Files Managed',
      value: files.length,
      icon: FolderOpen,
      color: 'nvidia-green'
    },
    {
      label: 'AI Conversations',
      value: conversationCount,
      icon: MessageSquare,
      color: 'nvidia-green-bright'
    },
    {
      label: 'Tasks Completed',
      value: tasks.filter(t => t.status === 'completed').length,
      icon: CheckCircle,
      color: 'nvidia-green'
    },
    {
      label: 'Active Tasks',
      value: activeTasks,
      icon: ListTodo,
      color: 'nvidia-green-bright'
    },
  ];

  // Build recent activity from real tasks
  const recentActivity = tasks
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5)
    .map((task) => {
      const date = new Date(task.updatedAt || task.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffH = Math.floor(diffMs / (1000 * 60 * 60));
      const time = diffH < 1 ? 'Just now' : diffH < 24 ? `${diffH}h ago` : `${Math.floor(diffH / 24)}d ago`;

      return {
        type: 'task',
        title: task.title || task.type || 'Task',
        time,
        status: task.status,
      };
    });

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="relative overflow-hidden nvidia-card p-6">
        <div className="absolute top-0 right-0 pointer-events-none opacity-20">
          <GlowEffect intensity="high">
            <div className="w-64 h-64 rounded-full" />
          </GlowEffect>
        </div>

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              Welcome to <span className="nvidia-text-gradient">NVIDIA Nexus</span>
            </h1>
            <p className="text-nvidia-text-secondary max-w-2xl text-lg">
              Your AI-powered file management and document processing assistant.
              Let Nemotron-3 help you organize, analyze, and synthesize your files.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-nvidia-green/10 border border-nvidia-green/30 rounded-lg shadow-[0_0_15px_rgba(118,185,0,0.1)]">
            <Zap className="w-5 h-5 text-nvidia-green" />
            <span className="text-nvidia-green font-semibold uppercase tracking-wider text-xs">AI Core Active</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StaggerItem key={index}>
            <div className="nvidia-card nvidia-card-hover p-4 group">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg bg-nvidia-gray group-hover:bg-nvidia-green font-medium transition-colors duration-300`}>
                  <stat.icon className={`w-5 h-5 ${stat.color === 'nvidia-green' ? 'text-nvidia-green' : 'text-nvidia-green-bright'} group-hover:text-nvidia-black`} />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1 flex items-baseline">
                <AnimatedCounter value={stat.value} />
              </div>
              <div className="text-sm text-nvidia-text-secondary font-medium">{stat.label}</div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-nvidia-green" />
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => navigate('/files')} className="nvidia-card nvidia-card-hover p-5 text-left group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-nvidia-green/10 group-hover:bg-nvidia-green/20 transition-colors">
                  <FolderOpen className="w-5 h-5 text-nvidia-green" />
                </div>
                <span className="font-semibold text-lg">Organize Files</span>
              </div>
              <p className="text-sm text-nvidia-text-secondary leading-relaxed">
                Let AI categorize and organize your files automatically based on content analysis
              </p>
            </button>

            <button onClick={() => navigate('/chat')} className="nvidia-card nvidia-card-hover p-5 text-left group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-nvidia-green-bright/10 group-hover:bg-nvidia-green-bright/20 transition-colors">
                  <FileText className="w-5 h-5 text-nvidia-green-bright" />
                </div>
                <span className="font-semibold text-lg">Synthesize Documents</span>
              </div>
              <p className="text-sm text-nvidia-text-secondary leading-relaxed">
                Combine information from multiple documents into a single, cohesive summary
              </p>
            </button>

            <button onClick={() => navigate('/chat')} className="nvidia-card nvidia-card-hover p-5 text-left group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-nvidia-green/10 group-hover:bg-nvidia-green/20 transition-colors">
                  <MessageSquare className="w-5 h-5 text-nvidia-green" />
                </div>
                <span className="font-semibold text-lg">Chat with AI</span>
              </div>
              <p className="text-sm text-nvidia-text-secondary leading-relaxed">
                Ask specific questions about your data or get help with technical documentation
              </p>
            </button>

            <button className="nvidia-card nvidia-card-hover p-5 text-left group border-dashed opacity-70 cursor-not-allowed">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-nvidia-gray">
                  <TrendingUp className="w-5 h-5 text-nvidia-text-secondary" />
                </div>
                <span className="font-semibold text-lg">Advanced Analytics</span>
              </div>
              <p className="text-sm text-nvidia-text-secondary">
                Coming soon: Deep insights into your file ecosystem and AI interactions
              </p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-nvidia-text-secondary" />
            Recent Activity
          </h2>

          <div className="nvidia-card p-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-nvidia-text-secondary text-center py-4">
                No recent activity. Start by uploading files or chatting with AI.
              </p>
            ) : (
              <StaggerContainer className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <StaggerItem key={index}>
                    <div className="flex items-start gap-3 pb-3 border-b border-nvidia-gray-light last:border-0 last:pb-0">
                      <div className={`w-2 h-2 rounded-full mt-2 shadow-[0_0_8px] ${
                        activity.status === 'completed'
                          ? 'bg-nvidia-green shadow-nvidia-green/40'
                          : activity.status === 'failed'
                          ? 'bg-red-500 shadow-red-500/40'
                          : 'bg-nvidia-green-bright shadow-nvidia-green-bright/40'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium hover:text-nvidia-green cursor-pointer transition-colors">
                          {activity.title}
                        </p>
                        <p className="text-xs text-nvidia-text-secondary">{activity.time}</p>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
