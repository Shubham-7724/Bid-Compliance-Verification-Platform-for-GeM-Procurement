import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, FileText, HelpCircle, Loader2 } from 'lucide-react';
import { sendChatQuery } from '../services/api';

export default function BidChatbot({ currentEvaluation }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hello Officer! I am your AI Tender Compliance Copilot for the Government e-Marketplace (GeM). Ask me anything about statutory regulations, GFR 2017 thresholds, or specific compliance findings for the active bid document."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const activeFilename = currentEvaluation?.filename || null;

  const quickPrompts = [
    "Summarize statutory compliance status",
    "Why was this bid flagged or approved?",
    "Explain MSME prior experience exemption",
    "Draft a clarification notice to the bidder",
    "Verify GSTIN & PAN consistency"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsLoading(true);

    try {
      const res = await sendChatQuery(textToSend, activeFilename);
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: res.answer || "I processed your request according to GeM GTC guidelines."
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const fallbackAiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Under GeM procurement regulations and GFR 2017: For the bid "${activeFilename || 'current proposal'}", the compliance engine verifies that bidders meet statutory thresholds (MSME, active GSTIN, 3+ years experience, financial turnover, and non-blacklisting affidavit). You can review the full audit log in the scorecard.`
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-white">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg tracking-wide flex items-center gap-2">
              <span>GeM AI Tender Compliance Copilot</span>
              <span className="text-xs bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-bold">
                Llama 3.1
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Procurement Officer Decision Support
            </p>
          </div>
        </div>

        {activeFilename && (
          <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/20 text-xs font-semibold text-white">
            <FileText className="w-4 h-4 text-blue-300" />
            <span className="truncate max-w-[200px]">Context: {activeFilename}</span>
          </div>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 px-6 flex gap-2.5 overflow-x-auto scrollbar-none">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 flex-shrink-0">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          Suggested:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="text-xs font-semibold bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-300 hover:border-blue-400 px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all shadow-xs cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-9 h-9 rounded-2xl bg-blue-900 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
            )}

            <div
              className={`max-w-[80%] p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-900 text-white rounded-br-none font-medium'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none font-medium'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm font-bold text-xs">
                PO
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3.5 justify-start">
            <div className="w-9 h-9 rounded-2xl bg-blue-900 text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-amber-300" />
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 rounded-bl-none text-sm text-slate-600 flex items-center gap-3 shadow-sm font-medium">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span>Analyzing tender clauses and generating guidance...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-5 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeFilename
                ? `Ask any compliance question about ${activeFilename}...`
                : "Ask about GeM rules, statutory thresholds, or tender clauses..."
            }
            disabled={isLoading}
            className="flex-1 text-sm px-5 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Send</span>
          </button>
        </form>
      </div>

    </div>
  );
}
