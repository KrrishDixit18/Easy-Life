import React from 'react';
import { motion } from 'motion/react';
import { Plus, Flame, CheckCircle2, Circle } from 'lucide-react';
import { UserHabit } from '@/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface HabitTrackerProps {
  habits: UserHabit[];
  onToggleHabit: (id: string) => void;
  onAddHabit: () => void;
}

export const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, onToggleHabit, onAddHabit }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light tracking-tight">Habits</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
            Build consistency
          </p>
        </div>
        <Button 
          size="icon" 
          variant="outline" 
          className="rounded-full border-zinc-800"
          onClick={onAddHabit}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-4">
        {habits.map((habit, i) => {
          const isDoneToday = habit.lastPerformed && new Date(habit.lastPerformed).toDateString() === new Date().toDateString();
          
          return (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="luxury-card !p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isDoneToday ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-900 text-zinc-500"
                  )}>
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">{habit.name}</h4>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      {habit.frequency}x per week
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onToggleHabit(habit.id)}
                  className="transition-transform active:scale-90"
                >
                  {isDoneToday ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-zinc-700" />
                  )}
                </button>
              </div>
              <Progress value={40} className="h-1 bg-zinc-900" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

import { cn } from '@/lib/utils';
