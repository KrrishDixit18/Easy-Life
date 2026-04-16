import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, CheckCircle2, Circle, MoreVertical, Clock, Calendar, Repeat } from 'lucide-react';
import { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleComplete, onToggleTimer, onDelete }) => {
  const [elapsed, setElapsed] = useState(task.timeSpent);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (task.isTimerRunning && task.timerStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - task.timerStartTime!) / 1000);
        setElapsed(task.timeSpent + diff);
      }, 1000);
    } else {
      setElapsed(task.timeSpent);
    }
    return () => clearInterval(interval);
  }, [task.isTimerRunning, task.timerStartTime, task.timeSpent]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const priorityColors = {
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "luxury-card mb-4 group relative overflow-hidden",
        task.completed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-4">
        <button 
          onClick={() => onToggleComplete(task.id)}
          className="mt-1 transition-transform active:scale-90"
        >
          {task.completed ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <Circle className="w-6 h-6 text-zinc-600" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "font-medium truncate",
              task.completed && "line-through text-zinc-500"
            )}>
              {task.title}
            </h3>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}>
              {task.priority}
            </Badge>
          </div>
          
          {task.description && (
            <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="font-mono">{formatTime(elapsed)}</span>
            </div>
            {task.repeatType !== 'none' && (
              <div className="flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                <span>{task.repeatType}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "rounded-full w-10 h-10",
              task.isTimerRunning ? "bg-rose-500/10 text-rose-500" : "bg-zinc-900 text-zinc-400"
            )}
            onClick={() => onToggleTimer(task.id)}
          >
            {task.isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
        </div>
      </div>

      {task.isTimerRunning && (
        <motion.div 
          className="absolute bottom-0 left-0 h-0.5 bg-rose-500"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}
    </motion.div>
  );
};
