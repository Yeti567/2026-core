'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Mic,
  Send,
  Bot,
  User,
  Clock,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Download,
  Mail,
  Users,
  BarChart3,
  Target,
  Loader2,
  Sparkles,
  Award,
  BookOpen
} from 'lucide-react';

// Types
interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  email?: string;
}

interface Message {
  id: string;
  role: 'auditor' | 'worker';
  content: string;
  timestamp: string;
  questionId?: string;
}

interface InterviewSession {
  id: string;
  audit_type: 'full' | 'quick' | 'element_specific';
  focus_element?: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  messages: Message[];
  started_at: string;
  completed_at?: string;
}

interface InterviewReport {
  id: string;
  session_id: string;
  overall_score: number;
  ready_for_audit: boolean;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  feedback: string;
  duration_minutes: number;
  questions_asked: number;
  questions_answered_well: number;
}

interface AuditStats {
  summary: {
    totalWorkers: number;
    workersCompletedAudit: number;
    workersPassedAudit: number;
    workersFailedAudit: number;
    workersNotAudited: number;
    averageScore: number;
    readinessPercentage: number;
  };
  workersNeedingAttention: Array<{
    id: string;
    name: string;
    position: string;
    score?: number;
    status: 'not_audited' | 'failed';
  }>;
  recommendation: string;
}

type AuditType = 'full' | 'quick' | 'element_specific';

const COR_ELEMENTS = [
  { number: 1, name: 'Health & Safety Policy' },
  { number: 2, name: 'Hazard Assessment' },
  { number: 3, name: 'Safe Work Practices' },
  { number: 4, name: 'Safe Job Procedures' },
  { number: 5, name: 'Company Safety Rules' },
  { number: 6, name: 'Personal Protective Equipment' },
  { number: 7, name: 'Preventative Maintenance' },
  { number: 8, name: 'Training & Communication' },
  { number: 9, name: 'Workplace Inspections' },
  { number: 10, name: 'Incident Investigation' },
  { number: 11, name: 'Emergency Preparedness' },
  { number: 12, name: 'Statistics & Records' },
  { number: 13, name: 'Legislation & Compliance' },
  { number: 14, name: 'Management Review' }
];

export default function MockAuditPage() {
  // State for setup
  const [step, setStep] = useState<'setup' | 'interview' | 'report'>('setup');
  const [auditType, setAuditType] = useState<AuditType>('quick');
  const [selectedElement, setSelectedElement] = useState<number>(1);
  const [selectedWorker, setSelectedWorker] = useState<string>('self');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  // State for interview
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentHint, setCurrentHint] = useState<string>('');
  const [showHint, setShowHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // State for report
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Fetch workers on mount
  useEffect(() => {
    fetchWorkers();
    fetchStats();
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer management
  useEffect(() => {
    if (step === 'interview' && session?.status === 'in_progress') {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, session?.status]);

  const fetchWorkers = async () => {
    setLoadingWorkers(true);
    try {
      const res = await fetch('/api/admin/employees?limit=100');
      if (res.ok) {
        const data = await res.json();
        setWorkers(data.employees || []);
      }
    } catch (error) {
      console.error('Failed to fetch workers:', error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/audit/mock-interview/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const startInterview = async () => {
    setLoading(true);
    try {
      // Create session
      const sessionRes = await fetch('/api/audit/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditType,
          workerId: selectedWorker === 'self' ? undefined : selectedWorker,
          focusElement: auditType === 'element_specific' ? selectedElement : undefined,
          isAnonymous: false
        })
      });

      if (!sessionRes.ok) throw new Error('Failed to create session');
      const sessionData = await sessionRes.json();
      setSession(sessionData.session);

      // Start the interview with AI
      const chatRes = await fetch(`/api/audit/mock-interview/${sessionData.session.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      if (!chatRes.ok) throw new Error('Failed to start interview');
      const chatData = await chatRes.json();
      
      setMessages([chatData.message]);
      setStep('interview');
      setTimer(0);
      
      // Set hint if available
      if (chatData.currentQuestion?.keyPoints) {
        setCurrentHint(`Think about: ${chatData.currentQuestion.keyPoints.slice(0, 3).join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !session || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setIsTyping(true);
    setShowHint(false);

    // Optimistically add worker message
    const workerMsg: Message = {
      id: `temp_${Date.now()}`,
      role: 'worker',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, workerMsg]);

    try {
      const res = await fetch(`/api/audit/mock-interview/${session.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          message: userMessage
        })
      });

      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();

      // Update messages with actual IDs
      setMessages(prev => {
        const filtered = prev.filter(m => !m.id.startsWith('temp_'));
        return [...filtered, data.workerMessage, data.auditorMessage];
      });

      // Update hint
      if (data.nextQuestion?.keyPoints) {
        setCurrentHint(`Think about: ${data.nextQuestion.keyPoints.slice(0, 3).join(', ')}`);
      }

      // Check if complete
      if (data.isComplete) {
        setSession(prev => prev ? { ...prev, status: 'completed' } : null);
        setTimeout(() => generateReport(), 1000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== workerMsg.id));
    } finally {
      setIsTyping(false);
    }
  };

  const generateReport = useCallback(async () => {
    if (!session) return;
    
    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/audit/mock-interview/${session.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error('Failed to generate report');
      const data = await res.json();
      setReport(data.report);
      setStep('report');
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGeneratingReport(false);
    }
  }, [session]);

  const resetSimulation = () => {
    setStep('setup');
    setSession(null);
    setMessages([]);
    setReport(null);
    setTimer(0);
    setInput('');
    setCurrentHint('');
    setShowHint(false);
    fetchStats();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSelectedWorkerName = () => {
    if (selectedWorker === 'self') return 'Yourself';
    if (selectedWorker === 'random') return 'Random Worker';
    const worker = workers.find(w => w.id === selectedWorker);
    return worker ? `${worker.first_name} ${worker.last_name}` : 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-[100rem] h-[100rem] rounded-full bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-[100rem] h-[100rem] rounded-full bg-gradient-to-tr from-violet-500/5 via-transparent to-transparent blur-3xl" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/audit-dashboard"
                className="text-slate-400 hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
            {step !== 'setup' && (
              <button
                onClick={resetSimulation}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            )}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20">
              <Mic className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Mock Audit Simulator</h1>
              <p className="text-slate-400">Practice for your COR audit interview with AI-powered simulation</p>
            </div>
          </div>
        </header>

        {/* Setup Step */}
        {step === 'setup' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Setup Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Audit Type Selection */}
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  Step 1: Select Audit Type
                </h2>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { type: 'full' as const, label: 'Full Mock Audit', duration: '60 min', desc: 'All COR elements' },
                    { type: 'quick' as const, label: 'Quick Check', duration: '15 min', desc: 'Random key questions' },
                    { type: 'element_specific' as const, label: 'Element-Specific', duration: '20 min', desc: 'Focus on one area' }
                  ].map(option => (
                    <button
                      key={option.type}
                      onClick={() => setAuditType(option.type)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        auditType === option.type
                          ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20'
                          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mb-3 flex items-center justify-center ${
                        auditType === option.type ? 'border-cyan-500 bg-cyan-500' : 'border-slate-500'
                      }`}>
                        {auditType === option.type && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <h3 className="font-medium text-white">{option.label}</h3>
                      <p className="text-xs text-slate-400 mt-1">{option.duration} • {option.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Element Selection for Element-Specific */}
                {auditType === 'element_specific' && (
                  <div className="mt-4">
                    <label className="block text-sm text-slate-400 mb-2">Select COR Element to Focus On:</label>
                    <div className="relative">
                      <select
                        value={selectedElement}
                        onChange={(e) => setSelectedElement(Number(e.target.value))}
                        className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white appearance-none cursor-pointer"
                      >
                        {COR_ELEMENTS.map(el => (
                          <option key={el.number} value={el.number}>
                            Element {el.number}: {el.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Worker Selection */}
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Step 2: Select Interviewee
                </h2>
                
                <div className="relative">
                  <select
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    disabled={loadingWorkers}
                    className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="self">Practice as Yourself</option>
                    <option value="random">Random Worker (simulates auditor selection)</option>
                    {workers.map(worker => (
                      <option key={worker.id} value={worker.id}>
                        {worker.first_name} {worker.last_name} - {worker.position || 'Worker'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
                
                {selectedWorker === 'random' && workers.length > 0 && (
                  <p className="mt-2 text-sm text-slate-400">
                    A random worker will be selected when you start, simulating how auditors choose interviewees.
                  </p>
                )}
              </div>

              {/* Start Button */}
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-cyan-400" />
                  Step 3: Start Interview
                </h2>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <button
                    onClick={startInterview}
                    disabled={loading}
                    className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold hover:from-cyan-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Begin Mock Audit
                      </>
                    )}
                  </button>
                  
                  <div className="text-sm text-slate-400">
                    <p>Interview: <span className="text-white">{getSelectedWorkerName()}</span></p>
                    <p>Type: <span className="text-white">
                      {auditType === 'full' ? 'Full Mock Audit' : auditType === 'quick' ? 'Quick Check' : `Element ${selectedElement}`}
                    </span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="space-y-6">
              {/* Readiness Card */}
              {stats && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    Mock Audit Readiness
                  </h3>
                  
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
                      {stats.summary.readinessPercentage}%
                    </div>
                    <p className="text-slate-400 text-sm mt-1">Team Readiness Score</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Workers Passed</span>
                      <span className="text-emerald-400">{stats.summary.workersPassedAudit} / {stats.summary.totalWorkers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Average Score</span>
                      <span className="text-white">{stats.summary.averageScore}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Not Yet Audited</span>
                      <span className="text-amber-400">{stats.summary.workersNotAudited}</span>
                    </div>
                  </div>

                  {stats.recommendation && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <p className="text-xs text-slate-300">{stats.recommendation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Workers Needing Attention */}
              {stats && stats.workersNeedingAttention.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Workers Needing Practice
                  </h3>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stats.workersNeedingAttention.slice(0, 5).map(worker => (
                      <div
                        key={worker.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
                      >
                        <div>
                          <p className="text-sm text-white">{worker.name}</p>
                          <p className="text-xs text-slate-400">{worker.position}</p>
                        </div>
                        {worker.status === 'not_audited' ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                            Not tested
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                            {worker.score}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips Card */}
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  Interview Tips
                </h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    Answer in your own words - auditors want understanding, not memorization
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    Give specific examples when possible
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    It's okay to say "I don't know" - be honest
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Interview Step */}
        {step === 'interview' && session && (
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Chat Interface */}
            <div className="lg:col-span-3 bg-slate-900/50 border border-slate-700/50 rounded-2xl backdrop-blur overflow-hidden flex flex-col h-[700px]">
              {/* Chat Header */}
              <div className="flex-shrink-0 p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                      <Mic className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">Mock Audit Interview</h2>
                      <p className="text-xs text-slate-400">{getSelectedWorkerName()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span className="text-white font-mono">{formatTime(timer)}</span>
                    </div>
                    {session.status === 'completed' && (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
                        Complete
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'worker' ? 'justify-end' : ''}`}
                  >
                    {message.role === 'auditor' && (
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-cyan-400" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${
                      message.role === 'worker'
                        ? 'bg-indigo-500/20 border border-indigo-500/30'
                        : 'bg-slate-800/50 border border-slate-700/50'
                    } rounded-2xl p-4`}>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    {message.role === 'worker' && (
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-indigo-400" />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {generatingReport && (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    <span className="text-slate-400">Generating your report...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex-shrink-0 p-4 border-t border-slate-700/50 bg-slate-800/30">
                {/* Hint */}
                {currentHint && (
                  <div className="mb-3">
                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
                    >
                      <Lightbulb className="w-3 h-3" />
                      {showHint ? 'Hide hint' : 'Need a hint?'}
                    </button>
                    {showHint && (
                      <div className="mt-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                        <p className="text-xs text-cyan-400">{currentHint}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={session.status === 'completed' ? 'Interview complete!' : 'Type your answer...'}
                    disabled={session.status === 'completed' || isTyping}
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || session.status === 'completed' || isTyping}
                    className="px-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 backdrop-blur">
                <h3 className="text-sm font-semibold text-white mb-3">Interview Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Type</span>
                    <span className="text-white capitalize">{session.audit_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Questions</span>
                    <span className="text-white">{messages.filter(m => m.role === 'auditor').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Status</span>
                    <span className={session.status === 'completed' ? 'text-emerald-400' : 'text-cyan-400'}>
                      {session.status === 'in_progress' ? 'In Progress' : 'Completed'}
                    </span>
                  </div>
                </div>
              </div>

              {session.status === 'completed' && !generatingReport && !report && (
                <button
                  onClick={generateReport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium hover:from-cyan-400 hover:to-teal-400 transition-all"
                >
                  <BarChart3 className="w-5 h-5" />
                  Generate Report
                </button>
              )}

              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 backdrop-blur">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  Quick Tips
                </h3>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>• Be specific and give examples</li>
                  <li>• Explain what YOU would do</li>
                  <li>• It's okay to say you'd ask someone</li>
                  <li>• Don't worry about perfect answers</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Report Step */}
        {step === 'report' && report && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl backdrop-blur overflow-hidden">
              {/* Report Header */}
              <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20">
                      <BarChart3 className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Mock Audit Report</h2>
                      <p className="text-sm text-slate-400">
                        {getSelectedWorkerName()} • {new Date().toLocaleDateString()} • {report.duration_minutes} minutes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${
                      report.overall_score >= 70 ? 'text-emerald-400' : 
                      report.overall_score >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {report.overall_score}%
                    </div>
                    <p className="text-sm text-slate-400">Overall Score</p>
                  </div>
                </div>
              </div>

              {/* Ready Status */}
              <div className={`px-6 py-4 flex items-center gap-3 ${
                report.ready_for_audit 
                  ? 'bg-emerald-500/10 border-b border-emerald-500/20' 
                  : 'bg-amber-500/10 border-b border-amber-500/20'
              }`}>
                {report.ready_for_audit ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Ready for Real Audit</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                    <span className="text-amber-400 font-medium">Additional Practice Recommended</span>
                  </>
                )}
              </div>

              {/* Report Content */}
              <div className="p-6 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">{report.questions_asked}</div>
                    <p className="text-xs text-slate-400">Questions Asked</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{report.questions_answered_well}</div>
                    <p className="text-xs text-slate-400">Answered Well</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">{report.duration_minutes}</div>
                    <p className="text-xs text-slate-400">Minutes</p>
                  </div>
                </div>

                {/* Strengths */}
                {report.strengths && report.strengths.length > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <h3 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {report.strengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-emerald-400 mt-1">✓</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {report.weaknesses && report.weaknesses.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <h3 className="font-semibold text-amber-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                      {report.weaknesses.map((weakness, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-amber-400 mt-1">⚠️</span>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {report.recommendations && report.recommendations.length > 0 && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <h3 className="font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Recommendations
                    </h3>
                    <ol className="space-y-2">
                      {report.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-medium">
                            {i + 1}
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Feedback */}
                {report.feedback && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <h3 className="font-semibold text-white mb-3">Auditor's Feedback</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{report.feedback}</p>
                  </div>
                )}
              </div>

              {/* Report Actions */}
              <div className="p-6 border-t border-slate-700/50 flex flex-wrap gap-3">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
                  <Download className="w-4 h-4" />
                  Download Report
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
                  <Mail className="w-4 h-4" />
                  Email to Worker
                </button>
                <button
                  onClick={resetSimulation}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors ml-auto"
                >
                  <RotateCcw className="w-4 h-4" />
                  Practice Again
                </button>
              </div>
            </div>

            {/* Achievement Badge */}
            {report.ready_for_audit && (
              <div className="mt-6 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-2xl p-6 text-center">
                <Award className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">Audit Ready!</h3>
                <p className="text-sm text-slate-400">
                  Great job! You've demonstrated solid safety knowledge. Keep practicing to stay sharp.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
