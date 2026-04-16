import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Mic, 
  Sparkles, 
  ListTodo, 
  Flame, 
  Settings, 
  Search,
  Brain,
  X,
  Check,
  Clock,
  LayoutGrid,
  LogIn
} from 'lucide-react';
import { Task, UserHabit, Priority, DailyFeedback, UserStats } from './types';
import { TaskCard } from './components/TaskCard';
import { VoiceInput } from './components/VoiceInput';
import { TaskSuggestions } from './components/TaskSuggestions';
import { DailyPlanner } from './components/DailyPlanner';
import { HabitTracker } from './components/HabitTracker';
import { geminiService, TaskSuggestion } from './lib/gemini';
import { auth, db } from './lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Toaster, toast } from 'sonner';
import { cn } from './lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [longTextInput, setLongTextInput] = useState('');
  const [dailyFeedback, setDailyFeedback] = useState<DailyFeedback | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    toast.error(`Database error: ${operationType}`);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setTasks([]);
      setHabits([]);
      return;
    }

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const newTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(newTasks);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks'));

    const habitsQuery = query(
      collection(db, 'habits'),
      where('userId', '==', user.uid)
    );

    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      const newHabits = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserHabit));
      setHabits(newHabits);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'habits'));

    return () => {
      unsubscribeTasks();
      unsubscribeHabits();
    };
  }, [user, isAuthReady]);

  useEffect(() => {
    if (!user || !isAuthReady || tasks.length === 0) return;

    const checkDailyFeedback = async () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Only check if it's past 1 AM
      if (currentHour < 1) return;

      const todayStr = now.toISOString().split('T')[0];
      const statsDocRef = doc(db, 'userStats', user.uid);
      
      try {
        const statsDoc = await getDocFromServer(statsDocRef);
        const stats = statsDoc.exists() ? statsDoc.data() as UserStats : {};

        if (stats.lastFeedbackDate !== todayStr) {
          // Check yesterday's tasks (or just current tasks if they are from yesterday)
          // For simplicity, we'll check all active tasks. If any are incomplete, it's a roast.
          const allCompleted = tasks.every(t => t.completed);
          const feedbackComment = await geminiService.generateDailyFeedback(tasks, allCompleted);
          
          const feedback: DailyFeedback = {
            date: todayStr,
            comment: feedbackComment,
            isRoast: !allCompleted
          };

          setDailyFeedback(feedback);
          setIsFeedbackModalOpen(true);

          await setDoc(statsDocRef, { lastFeedbackDate: todayStr }, { merge: true });
        }
      } catch (error) {
        console.error('Error checking daily feedback:', error);
      }
    };

    checkDailyFeedback();
  }, [user, isAuthReady, tasks]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error('Login failed');
    }
  };

  const addTask = async (title: string, description = '', priority: Priority = 'medium', estimatedMinutes = 30, repeatType: 'none' | 'daily' | 'weekly' = 'none') => {
    if (!user) return;
    const taskId = Math.random().toString(36).substr(2, 9);
    const newTask: Task = {
      id: taskId,
      userId: user.uid,
      title,
      description,
      priority,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      repeatType,
      timeSpent: 0,
      isTimerRunning: false,
    };

    try {
      await setDoc(doc(db, 'tasks', taskId), newTask);
      toast.success('Task added');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tasks/${taskId}`);
    }
  };

  const handleToggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      await updateDoc(doc(db, 'tasks', id), {
        completed: !task.completed,
        updatedAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const handleToggleTimer = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      if (task.isTimerRunning) {
        const now = Date.now();
        const diff = Math.floor((now - task.timerStartTime!) / 1000);
        await updateDoc(doc(db, 'tasks', id), {
          isTimerRunning: false,
          timeSpent: task.timeSpent + diff,
          timerStartTime: null,
          updatedAt: now
        });
      } else {
        // Stop other running timers first
        const runningTask = tasks.find(t => t.isTimerRunning);
        if (runningTask) {
          const now = Date.now();
          const diff = Math.floor((now - runningTask.timerStartTime!) / 1000);
          await updateDoc(doc(db, 'tasks', runningTask.id), {
            isTimerRunning: false,
            timeSpent: runningTask.timeSpent + diff,
            timerStartTime: null,
            updatedAt: now
          });
        }
        await updateDoc(doc(db, 'tasks', id), {
          isTimerRunning: true,
          timerStartTime: Date.now(),
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      toast.info('Task deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const handleOptimizePlan = async () => {
    setIsProcessingAI(true);
    try {
      const activeTasks = tasks.filter(t => !t.completed);
      const orderedIds = await geminiService.generateDailyPlan(activeTasks);
      // In a real app, we'd update an 'order' field. For now, we'll just toast.
      toast.success('AI suggested a better order for your tasks!');
    } catch (error) {
      toast.error('Failed to optimize plan');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleSummarize = async () => {
    if (!longTextInput.trim()) return;
    setIsProcessingAI(true);
    try {
      const result = await geminiService.summarizeTask(longTextInput);
      await addTask(result.title, result.description);
      setLongTextInput('');
    } catch (error) {
      toast.error('Failed to summarize text');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleVoiceTranscript = async (transcript: string) => {
    setIsProcessingAI(true);
    try {
      const result = await geminiService.processVoiceTranscript(transcript);
      if (result.title) {
        await addTask(result.title, result.description, result.priority as Priority || 'medium');
        setIsVoiceModalOpen(false);
      }
    } catch (error) {
      toast.error('Failed to process voice input');
    } finally {
      setIsProcessingAI(false);
    }
  };

  useEffect(() => {
    if (user) {
      const fetchSuggestions = async () => {
        setIsLoadingSuggestions(true);
        try {
          const context = tasks.map(t => t.title).join(', ');
          const newSuggestions = await geminiService.getTaskSuggestions(context);
          setSuggestions(newSuggestions);
        } catch (error) {
          console.error('Suggestions error:', error);
        } finally {
          setIsLoadingSuggestions(false);
        }
      };
      fetchSuggestions();
    }
  }, [user, tasks.length]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="luxury-card max-w-sm w-full py-12"
        >
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <LayoutGrid className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-light tracking-tight mb-2">EasyLife</h1>
          <p className="text-zinc-500 text-sm mb-12 px-6">
            Elevate your productivity with AI-driven task management and voice intelligence.
          </p>
          <Button 
            onClick={handleLogin}
            className="w-full h-14 rounded-2xl bg-white text-black hover:bg-zinc-200 font-semibold text-lg"
          >
            <LogIn className="w-5 h-5 mr-3" />
            Sign in with Google
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Toaster position="top-center" theme="dark" />
      
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent className={cn(
          "border-none text-white sm:max-w-md rounded-3xl p-8 overflow-hidden",
          dailyFeedback?.isRoast ? "bg-rose-950/90" : "bg-emerald-950/90"
        )}>
          <div className="absolute top-0 left-0 w-full h-1 bg-white/20" />
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center animate-bounce",
              dailyFeedback?.isRoast ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
            )}>
              {dailyFeedback?.isRoast ? <Flame className="w-10 h-10" /> : <Sparkles className="w-10 h-10" />}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-light tracking-tight">
                {dailyFeedback?.isRoast ? "The 1 AM Roast" : "Midnight Praise"}
              </h2>
              <p className="text-xs uppercase tracking-widest opacity-60">
                Performance Review • {dailyFeedback?.date}
              </p>
            </div>

            <p className="text-lg font-medium leading-relaxed italic">
              "{dailyFeedback?.comment}"
            </p>

            <Button 
              onClick={() => setIsFeedbackModalOpen(false)}
              className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold"
            >
              {dailyFeedback?.isRoast ? "I'll do better..." : "Keep it up!"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <header className="p-6 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-40">
        <div>
          <h1 className="text-xl font-light tracking-widest uppercase">EasyLife</h1>
          <p className="text-[10px] text-zinc-500 font-medium tracking-[0.2em] uppercase mt-0.5">AI Productivity</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full bg-zinc-900/50">
            <Search className="w-4 h-4 text-zinc-400" />
          </Button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
            <img src={user.photoURL || ''} alt={user.displayName || ''} referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      <main className="px-6 max-w-lg mx-auto">
        <Tabs defaultValue="planner" className="w-full">
          <TabsList className="w-full bg-zinc-900/50 p-1 rounded-2xl mb-8 border border-zinc-800/50">
            <TabsTrigger value="planner" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-black transition-all">
              <LayoutGrid className="w-4 h-4 mr-2" />
              Planner
            </TabsTrigger>
            <TabsTrigger value="habits" className="flex-1 rounded-xl data-[state=active]:bg-white data-[state=active]:text-black transition-all">
              <Flame className="w-4 h-4 mr-2" />
              Habits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planner" className="mt-0 outline-none">
            <DailyPlanner 
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onToggleTimer={handleToggleTimer}
              onDelete={handleDeleteTask}
              onOptimize={handleOptimizePlan}
            />
            
            <div className="mt-12">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="micro-label">Smart Suggestions</h3>
              </div>
              <TaskSuggestions 
                suggestions={suggestions}
                onAdd={(s) => addTask(s.title, s.description, s.priority, s.estimatedMinutes)}
                isLoading={isLoadingSuggestions}
              />
            </div>
          </TabsContent>

          <TabsContent value="habits" className="mt-0 outline-none">
            <HabitTracker 
              habits={habits}
              onToggleHabit={async (id) => {
                try {
                  await updateDoc(doc(db, 'habits', id), { lastPerformed: Date.now() });
                  toast.success('Habit tracked!');
                } catch (error) {
                  handleFirestoreError(error, OperationType.UPDATE, `habits/${id}`);
                }
              }}
              onAddHabit={() => toast.info('Add habit feature coming soon')}
            />
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent z-50">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-4">
          <Dialog open={isVoiceModalOpen} onOpenChange={setIsVoiceModalOpen}>
            <DialogTrigger 
              render={
                <Button 
                  size="lg" 
                  className="h-14 px-8 rounded-full bg-white text-black hover:bg-zinc-200 shadow-2xl shadow-white/10 group"
                >
                  <Mic className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">Voice Task</span>
                </Button>
              }
            />
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-center font-light tracking-tight text-xl">Voice to Task</DialogTitle>
              </DialogHeader>
              <div className="py-12">
                <VoiceInput 
                  onTranscript={handleVoiceTranscript}
                  isProcessing={isProcessingAI}
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger 
              render={
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-14 w-14 rounded-full border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800"
                >
                  <Plus className="w-6 h-6" />
                </Button>
              }
            />
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="font-light tracking-tight text-xl">New Task</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="w-full bg-zinc-900 p-1 rounded-xl mb-4">
                  <TabsTrigger value="manual" className="flex-1 rounded-lg">Manual</TabsTrigger>
                  <TabsTrigger value="summarize" className="flex-1 rounded-lg">AI Summarize</TabsTrigger>
                </TabsList>

                <TabsContent value="manual">
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    await addTask(
                      formData.get('title') as string, 
                      formData.get('description') as string,
                      'medium',
                      30,
                      formData.get('repeat') as any
                    );
                    (e.target as HTMLFormElement).reset();
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="micro-label">Title</Label>
                      <Input id="title" name="title" required className="bg-zinc-900 border-zinc-800 rounded-xl" placeholder="What needs to be done?" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="micro-label">Description</Label>
                      <Textarea id="description" name="description" className="bg-zinc-900 border-zinc-800 rounded-xl min-h-[80px]" placeholder="Add some details..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="repeat" className="micro-label">Repeat</Label>
                      <select name="repeat" className="w-full bg-zinc-900 border-zinc-800 rounded-xl p-2 text-sm outline-none">
                        <option value="none">No Repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold">
                      Create Task
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="summarize">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="micro-label">Paste Long Input</Label>
                      <Textarea 
                        value={longTextInput}
                        onChange={(e) => setLongTextInput(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 rounded-xl min-h-[150px]" 
                        placeholder="Paste an email, article, or long note to turn into a task..." 
                      />
                    </div>
                    <Button 
                      onClick={handleSummarize}
                      disabled={isProcessingAI || !longTextInput.trim()}
                      className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold"
                    >
                      {isProcessingAI ? "Summarizing..." : "Summarize with AI"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
