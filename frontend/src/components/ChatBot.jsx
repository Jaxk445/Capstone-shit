import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { sanitizeText, sanitizeTaskTitle } from '../utils/sanitizer.js';

const ChatBot = ({ userProfile, tasks = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // --- 1. INITIAL STATE ---
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Initializing secure operational channels...' }
    ]);

    // --- 2. SMART GREETING UPDATE ---
    useEffect(() => {
        if (!userProfile) return;

        const myActiveCount = tasks.filter(t => {
            const isActive = t.status === 'To Do' || t.status === 'In Progress' || t.status === 'Revision Needed';

            if (userProfile.role === 'supervisor') return isActive;

            return isActive && (t.assigned_to || []).some(id => String(id) === String(userProfile.id));
        }).length;

        if (messages.length <= 1) {
            const safeName = sanitizeText(userProfile.name || '').split(' ')[0] || 'there';
            setMessages([
                { 
                    role: 'assistant', 
                    text: `Hi ${safeName}! I see you have ${myActiveCount} active tasks. How can I help you today?` 
                }
            ]);
        }
    }, [tasks, userProfile]); 

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    // --- Client-side rate limiter (localStorage-backed) ---
    const RATE_LIMIT_KEY = 'chatbot_rate_attempts';
    const RATE_LIMIT_MAX = 5; // max attempts
    const RATE_LIMIT_WINDOW_MS = 60 * 1000; // window in ms

    const loadAttempts = () => {
        try {
            const raw = localStorage.getItem(RATE_LIMIT_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : [];
        } catch (e) {
            return [];
        }
    };

    const saveAttempts = (arr) => {
        try { localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(arr)); } catch (e) {}
    };

    const cleanupAttempts = () => {
        const now = Date.now();
        const arr = loadAttempts().filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
        saveAttempts(arr);
        return arr;
    };

    const isAllowed = () => cleanupAttempts().length < RATE_LIMIT_MAX;

    const recordAttempt = () => {
        const now = Date.now();
        const arr = cleanupAttempts();
        arr.push(now);
        saveAttempts(arr);
        return arr;
    };

    const getRetryAfterSeconds = () => {
        const arr = cleanupAttempts();
        if (arr.length < RATE_LIMIT_MAX) return 0;
        const now = Date.now();
        const oldest = arr[0] || now;
        const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldest);
        return Math.max(1, Math.ceil(waitMs / 1000));
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        // Client-side rate limit check
        if (!isAllowed()) {
            const wait = getRetryAfterSeconds();
            setMessages(prev => [...prev, { role: 'model', text: `Rate limit exceeded. Please wait ${wait} seconds before trying again.` }]);
            return;
        }

        const cleanInput = sanitizeText(input);
        const userMessage = { role: 'user', text: cleanInput };
        const updatedHistory = [...messages, userMessage];

        setMessages(updatedHistory);
        setInput('');
        setIsLoading(true);

        try {
            // --- 3. CONTEXT INJECTION ---
            const sharedTasksContext = tasks.filter(t => {
                const isNotDone = !['Completed', 'Approved'].includes(t.status);
                if (userProfile.role === 'supervisor') return isNotDone;
                return isNotDone && (t.assigned_to || []).some(id => String(id) === String(userProfile.id));
            });
            
            const taskContext = sharedTasksContext.length > 0 
                ? sharedTasksContext.map(t => `| ${sanitizeTaskTitle(t.title)} | ${sanitizeText(t.status)} | ${sanitizeText(t.priority)} | ${sanitizeText(t.due_date)} |`).join('\n')
                : 'No active tasks found.';

            const safeName = sanitizeText(userProfile.name || '').split(' ')[0] || 'Employee';
            const systemPrompt = `You are a professional Customs AI assistant for ${safeName}. Current Workspace Context: ${taskContext}. Output all tables in Markdown.`;

            const formattedHistory = updatedHistory
                .filter((msg, index) => !(index === 0 && msg.text.includes('Initializing secure operational channels...')) && !(index === 0 && msg.text.startsWith('Hi ')))
                .map(msg => ({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text }));

            const resp = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ input: cleanInput, systemPrompt, messages: formattedHistory })
            });

            if (resp.status === 429) {
                const data = await resp.json().catch(() => ({}));
                const wait = data.retryAfter ? Math.max(1, Math.ceil(data.retryAfter / 1000)) : getRetryAfterSeconds();
                throw new Error(`Rate limit exceeded. Please wait ${wait} seconds before trying again.`);
            }

            if (!resp.ok) throw new Error('AI server error');
            const data = await resp.json();
            const text = (data && (data.text || data.reply)) || 'No response from assistant.';

            recordAttempt();

            setMessages(prev => [...prev, { role: 'assistant', text }]);

        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
            
            {isOpen && (
                <div className="bg-white w-80 h-96 rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden mb-4 animate-fade-in-up dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">✨</span>
                            <h3 className="font-bold text-sm">Claude AI Workspace Copilot</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:text-gray-200 font-bold">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed shadow-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
                                }`}>
                                    {msg.role === 'user' ? (
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    ) : (
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="whitespace-pre-wrap" {...props} />,
                                                table: ({ node, ...props }) => <table className="w-full border-collapse border border-gray-300 text-[10px]" {...props} />,
                                                th: ({ node, ...props }) => <th className="border border-gray-300 bg-gray-100 p-1" {...props} />,
                                                td: ({ node, ...props }) => <td className="border border-gray-300 p-1" {...props} />,
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-xl rounded-bl-none shadow-sm border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 bg-white border-t border-gray-100 flex gap-2 dark:bg-gray-800 dark:border-gray-700">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask Claude to analyze..."
                            className="flex-1 p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A2.001 2.001 0 005.443 9.25H9a.75.75 0 010 1.5H5.443a2.001 2.001 0 00-1.75 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`${isOpen ? 'bg-gray-600 rotate-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-110'} text-white w-14 h-14 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center text-2xl z-50`}
            >
                {isOpen ? '✕' : '✨'}
            </button>
        </div>
    );
};

export default ChatBot;