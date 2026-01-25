'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot,
  User,
  RotateCcw,
  ChevronDown,
  CheckCircle,
  XCircle,
  Lightbulb,
  Play,
  Pause,
  Volume2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MOCK_AUDIT_QUESTIONS, type MockAuditQuestion } from '@/lib/audit';
import { markdownToSafeHtml } from '@/lib/utils/html-sanitizer';

interface Message {
  id: string;
  role: 'auditor' | 'user';
  content: string;
  timestamp: Date;
  feedback?: {
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    tip: string;
  };
}

type InterviewCategory = 'all' | 'worker' | 'supervisor' | 'management';

export function MockAuditSimulator() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<MockAuditQuestion | null>(null);
  const [questionsAsked, setQuestionsAsked] = useState<string[]>([]);
  const [category, setCategory] = useState<InterviewCategory>('worker');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionScore, setSessionScore] = useState({ total: 0, count: 0 });
  const [showSampleAnswer, setShowSampleAnswer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getFilteredQuestions = () => {
    return MOCK_AUDIT_QUESTIONS.filter(q => 
      category === 'all' || q.category === category
    ).filter(q => !questionsAsked.includes(q.id));
  };

  const startSimulation = () => {
    const questions = getFilteredQuestions();
    if (questions.length === 0) {
      setMessages([{
        id: Date.now().toString(),
        role: 'auditor',
        content: 'You\'ve answered all questions in this category! Try another category or restart the simulation.',
        timestamp: new Date(),
      }]);
      return;
    }

    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(randomQuestion);
    setQuestionsAsked(prev => [...prev, randomQuestion.id]);
    
    const greeting = messages.length === 0 
      ? `Hello, I'm conducting a COR audit interview. I'll be asking you questions about workplace safety. Let's begin.\n\n`
      : '';

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'auditor',
      content: `${greeting}**Question (Element ${randomQuestion.elementNumber}):**\n\n${randomQuestion.question}`,
      timestamp: new Date(),
    }]);
    setShowSampleAnswer(false);
  };

  const evaluateAnswer = (answer: string, question: MockAuditQuestion) => {
    const answerLower = answer.toLowerCase();
    const matchedKeywords = question.expectedKeywords.filter(kw => 
      answerLower.includes(kw.toLowerCase())
    );
    const missingKeywords = question.expectedKeywords.filter(kw => 
      !answerLower.includes(kw.toLowerCase())
    );
    
    // Score based on keyword matches and answer length
    const keywordScore = (matchedKeywords.length / question.expectedKeywords.length) * 70;
    const lengthBonus = Math.min(answer.length / 100 * 10, 15); // Up to 15 points for detailed answer
    const coherenceBonus = answer.split(' ').length >= 10 ? 15 : answer.split(' ').length >= 5 ? 10 : 5;
    
    const score = Math.round(Math.min(keywordScore + lengthBonus + coherenceBonus, 100));
    
    let tip = '';
    if (score >= 80) {
      tip = 'Excellent! Your answer demonstrates good safety knowledge.';
    } else if (score >= 60) {
      tip = 'Good answer, but consider including more specific details.';
    } else if (score >= 40) {
      tip = 'Your answer covers basics but misses some key points.';
    } else {
      tip = 'Consider reviewing this topic before the actual audit.';
    }

    return { score, matchedKeywords, missingKeywords, tip };
  };

  const handleSubmit = () => {
    if (!input.trim() || !currentQuestion) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const feedback = evaluateAnswer(input, currentQuestion);
      setSessionScore(prev => ({
        total: prev.total + feedback.score,
        count: prev.count + 1,
      }));

      const feedbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'auditor',
        content: getFeedbackMessage(feedback),
        timestamp: new Date(),
        feedback,
      };
      setMessages(prev => [...prev, feedbackMessage]);
      setIsTyping(false);
      setCurrentQuestion(null);
    }, 1500);
  };

  const getFeedbackMessage = (feedback: { score: number; matchedKeywords: string[]; missingKeywords: string[]; tip: string }) => {
    let message = `**Score: ${feedback.score}/100**\n\n`;
    
    if (feedback.matchedKeywords.length > 0) {
      message += `✓ Good points covered: ${feedback.matchedKeywords.join(', ')}\n\n`;
    }
    
    if (feedback.missingKeywords.length > 0) {
      message += `○ Could also mention: ${feedback.missingKeywords.join(', ')}\n\n`;
    }
    
    message += `💡 ${feedback.tip}`;
    
    return message;
  };

  const resetSimulation = () => {
    setMessages([]);
    setCurrentQuestion(null);
    setQuestionsAsked([]);
    setSessionScore({ total: 0, count: 0 });
    setShowSampleAnswer(false);
  };

  const averageScore = sessionScore.count > 0 
    ? Math.round(sessionScore.total / sessionScore.count) 
    : 0;

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur overflow-hidden flex flex-col h-[600px]">
      <CardHeader className="border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-teal-500/20">
              <MessageSquare className="w-6 h-6 text-teal-400" />
            </div>
            Mock Audit Simulator
          </CardTitle>
          
          {sessionScore.count > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-400">Session Score</div>
                <div className={`text-lg font-bold ${
                  averageScore >= 80 ? 'text-emerald-400' : 
                  averageScore >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {averageScore}%
                </div>
              </div>
              <button
                onClick={resetSimulation}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Reset simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        {/* Category selector */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-slate-400">Interview:</span>
          {(['worker', 'supervisor', 'management', 'all'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                category === cat
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm">
                <Bot className="w-16 h-16 text-teal-400/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-200 mb-2">
                  Practice Your Audit Interview
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                  This simulator will ask you questions similar to what a COR auditor would ask. 
                  Answer as you would in a real audit to test your safety knowledge.
                </p>
                <button
                  onClick={startSimulation}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:from-teal-400 hover:to-cyan-400 transition-all flex items-center gap-2 mx-auto"
                >
                  <Play className="w-5 h-5" />
                  Start Interview
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                >
                  {message.role === 'auditor' && (
                    <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-teal-400" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${
                    message.role === 'user' 
                      ? 'bg-indigo-500/20 border border-indigo-500/30' 
                      : 'bg-slate-800/50 border border-slate-700/50'
                  } rounded-2xl p-4`}>
                    <div 
                      className="text-sm text-slate-200 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: markdownToSafeHtml(message.content)
                          .replace(/<strong>/g, '<strong class="text-white">')
                      }}
                    />
                    
                    {message.feedback && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          {message.feedback.score >= 80 ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : message.feedback.score >= 60 ? (
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <div className={`h-2 flex-1 bg-slate-700 rounded-full overflow-hidden`}>
                            <div 
                              className={`h-full transition-all ${
                                message.feedback.score >= 80 ? 'bg-emerald-500' :
                                message.feedback.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${message.feedback.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-indigo-400" />
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-teal-400" />
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
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
        
        {/* Input area */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700/50 bg-slate-800/30">
          {currentQuestion && (
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => setShowSampleAnswer(!showSampleAnswer)}
                className="text-xs text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-1"
              >
                <Lightbulb className="w-3 h-3" />
                {showSampleAnswer ? 'Hide' : 'Show'} sample answer
              </button>
              <span className="text-xs text-slate-500">
                Difficulty: {currentQuestion.difficulty}
              </span>
            </div>
          )}
          
          {showSampleAnswer && currentQuestion && (
            <div className="mb-3 p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg">
              <p className="text-xs text-teal-400 font-medium mb-1">Sample Answer:</p>
              <p className="text-sm text-slate-300">{currentQuestion.sampleAnswer}</p>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              placeholder={currentQuestion ? "Type your answer..." : "Click 'Next Question' to continue"}
              disabled={!currentQuestion || isTyping}
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50"
            />
            
            {currentQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isTyping}
                className="px-4 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={startSimulation}
                disabled={isTyping}
                className="px-4 py-3 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors whitespace-nowrap"
              >
                Next Question
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
