import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Send, Sparkles, Loader2, Music } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { motion } from 'framer-motion';
import { functions } from '@/services/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation as useAppLocation } from '@/contexts/LocationContext';

/** Render markdown-style links and bold in assistant messages */
function renderMessageContent(content: string): React.JSX.Element {
  // Split on markdown patterns: [text](url) and **bold**
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let key = 0;

  while (remaining.length > 0) {
    // Check for markdown link [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    // Check for bold **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

    // Find earliest match
    const linkIdx = linkMatch ? remaining.indexOf(linkMatch[0]) : Infinity;
    const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;

    if (linkIdx === Infinity && boldIdx === Infinity) {
      parts.push(remaining);
      break;
    }

    if (linkIdx <= boldIdx && linkMatch) {
      // Add text before the link
      if (linkIdx > 0) parts.push(remaining.slice(0, linkIdx));
      const [full, text, url] = linkMatch;
      // Internal links use <Link>, external use <a>
      if (url.startsWith('/')) {
        parts.push(
          <Link key={key++} to={url} className="text-stub-amber hover:text-stub-amber/80 underline underline-offset-2 transition-colors">
            {text}
          </Link>
        );
      } else {
        parts.push(
          <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-stub-amber hover:text-stub-amber/80 underline underline-offset-2 transition-colors">
            {text}
          </a>
        );
      }
      remaining = remaining.slice(linkIdx + full.length);
    } else if (boldMatch) {
      if (boldIdx > 0) parts.push(remaining.slice(0, boldIdx));
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldIdx + boldMatch[0].length);
    }
  }

  return <div className="whitespace-pre-wrap">{parts}</div>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  "What show should I see this week?",
  "I'm into punk and post-rock. What's coming up?",
  "What's a good date night concert?",
  "I want to discover something new this month",
];

export function AskStubPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location } = useAppLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string): Promise<void> {
    const message = text ?? input.trim();
    if (!message || isLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const askStub = httpsCallable<
        { messages: ChatMessage[]; location: { city: string; state: string; lat: number; lng: number } },
        { response: string }
      >(functions, 'askStub');

      const result = await askStub({
        messages: newMessages,
        location: { city: location.city, state: location.state, lat: location.lat, lng: location.lng },
      });

      setMessages([...newMessages, { role: 'assistant', content: result.data.response }]);
    } catch (err) {
      console.error('Ask Stub failed:', err);
      setMessages([...newMessages, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Try again in a moment!",
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-stub-muted">Sign in to chat with Stub.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <Helmet>
        <title>Ask Stub — The Stub Live</title>
      </Helmet>

      {/* Header */}
      <div className="px-4 py-3 border-b border-stub-border flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-stub-muted hover:text-stub-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stub-amber to-stub-coral flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-stub-bg" />
          </div>
          <div>
            <h1 className="font-display font-bold text-stub-text text-sm">Ask Stub</h1>
            <p className="text-[10px] text-stub-muted">Your concert discovery assistant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-stub-amber/20 to-stub-coral/20 flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-stub-amber" />
            </div>
            <h2 className="font-display font-bold text-stub-text text-lg mb-2">What should I see?</h2>
            <p className="text-sm text-stub-muted mb-6 max-w-xs mx-auto">
              Ask me anything about upcoming shows in {location.city}. I know what's happening and can help you find your next great concert.
            </p>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="w-full text-left px-4 py-3 bg-stub-surface border border-stub-border rounded-xl text-sm text-stub-text
                    hover:border-stub-amber/50 hover:bg-stub-surface transition-colors"
                >
                  <span className="text-stub-amber mr-1.5">✦</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-stub-amber text-stub-bg rounded-br-md'
                : 'bg-stub-surface border border-stub-border text-stub-text rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? renderMessageContent(msg.content) : <div className="whitespace-pre-wrap">{msg.content}</div>}
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-stub-surface border border-stub-border rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 text-stub-amber animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-stub-border bg-stub-bg">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about upcoming shows..."
            disabled={isLoading}
            className="flex-1 bg-stub-surface border border-stub-border rounded-full px-4 py-2.5 text-sm text-stub-text
              placeholder:text-stub-muted/50 focus:outline-none focus:border-stub-amber/50 transition-colors
              disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-stub-amber text-stub-bg rounded-full hover:bg-stub-amber/90 transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
