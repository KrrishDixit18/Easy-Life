export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  
  // Recurrence
  repeatType: 'none' | 'daily' | 'weekly';
  repeatDays?: number[]; // 0-6 for Sun-Sat
  
  // Time Tracking
  timeSpent: number; // in seconds
  isTimerRunning: boolean;
  timerStartTime?: number; // timestamp
  
  // AI Metadata
  isAISuggested?: boolean;
  summarizedFrom?: string;
}

export interface UserHabit {
  id: string;
  userId: string;
  name: string;
  frequency: number; // times per week
  lastPerformed?: number;
}

export interface DailyFeedback {
  date: string; // YYYY-MM-DD
  comment: string;
  isRoast: boolean;
}

export interface UserStats {
  lastFeedbackDate?: string; // YYYY-MM-DD
}
