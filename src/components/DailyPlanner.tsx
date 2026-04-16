import React from 'react';
import { motion } from 'motion/react';
import { ListTodo, Clock, Brain } from 'lucide-react';
import { Task } from '@/types';
import { TaskCard } from './TaskCard';

interface DailyPlannerProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onDelete: (id: string) => void;
  onOptimize: () => void;
}

export const DailyPlanner: React.FC<DailyPlannerProps> = ({ 
  tasks, 
  onToggleComplete, 
  onToggleTimer, 
  onDelete,
  onOptimize 
}) => {
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light tracking-tight">Today's Focus</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
            {activeTasks.length} tasks remaining
          </p>
        </div>
        <button 
          onClick={onOptimize}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-xs font-semibold hover:scale-105 transition-transform active:scale-95"
        >
          <Brain className="w-4 h-4" />
          AI Optimize
        </button>
      </div>

      <div className="space-y-4">
        {activeTasks.length > 0 ? (
          activeTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggleComplete={onToggleComplete}
              onToggleTimer={onToggleTimer}
              onDelete={onDelete}
            />
          ))
        ) : (
          <div className="py-12 text-center border border-dashed border-zinc-800 rounded-3xl">
            <ListTodo className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No tasks for today. Add one or get suggestions!</p>
          </div>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-900">
          <h3 className="micro-label">Completed</h3>
          {completedTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggleComplete={onToggleComplete}
              onToggleTimer={onToggleTimer}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
