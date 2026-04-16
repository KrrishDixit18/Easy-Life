import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Plus, ArrowRight } from 'lucide-react';
import { TaskSuggestion } from '@/lib/gemini';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TaskSuggestionsProps {
  suggestions: TaskSuggestion[];
  onAdd: (suggestion: TaskSuggestion) => void;
  isLoading?: boolean;
}

export const TaskSuggestions: React.FC<TaskSuggestionsProps> = ({ suggestions, onAdd, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-zinc-900/50 animate-pulse rounded-2xl border border-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {suggestions.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="luxury-card !p-4 flex items-center justify-between group"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <h4 className="text-sm font-medium">{s.title}</h4>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] px-1 py-0 opacity-60 uppercase">
                {s.priority}
              </Badge>
              <span className="text-[10px] text-zinc-500">{s.estimatedMinutes}m</span>
            </div>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="rounded-full hover:bg-white hover:text-black transition-colors"
            onClick={() => onAdd(s)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </motion.div>
      ))}
    </div>
  );
};
