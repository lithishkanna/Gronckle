import { useState, useRef, useEffect, useCallback } from 'react';
import { submitToInbox } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { Send } from 'lucide-react';

interface CommandLine {
  id: string;
  prompt: string;
  input?: string;
  output?: string;
  type: 'input' | 'output' | 'error' | 'success';
  colored?: boolean;
  isDonate?: boolean;
}

const AVAILABLE_COMMANDS = ['help', 'clear', 'about', 'version', 'contact', 'message', 'msg', 'den', 'smelt', 'stash', 'cave', 'intel', 'forge', 'source', 'terminal', 'whoami', 'donate', 'discord', 'changelog'];

const HELP_TEXT = `Available commands:
  help      — Show this help message
  clear     — Clear terminal history
  contact   — Open the contact form
  discord   — Join our developer Discord community
  changelog — View Gronckle release history & changelog
  den       — Browse curated tools & tech news in the Den
  smelt     — AI stack generator in the Smelt
  stash     — Explore GitHub repositories in the Stash
  cave      — Contact & dragon support in the Cave
  donate    — Support the project
  about     — About Gronckle
  version   — Show terminal version
  whoami    — Who are you?`;

const ABOUT_TEXT = `GRONCKLE — Hoard the Best. Build the Rest.

A weekly-updated vault of developer tools, GitHub repos,
and tech signals. Built for those who build.

  © 2024 lithish — gronckle.dev`;

export function TheTerminal() {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [currentField, setCurrentField] = useState<'command' | 'name' | 'email' | 'message' | 'submit'>('command');
  const [commandInput, setCommandInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [commandHistory, setCommandHistory] = useState<CommandLine[]>([]);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCommandHistory([
      { id: 'welcome-1', prompt: '', output: 'GRONCKLE Cave v5.0.0 — Hoard the Best. Build the Rest.', type: 'output' },
      { id: 'welcome-2', prompt: '', output: 'Type "help" for available commands, "discord" for community, or "changelog" for updates.\n', type: 'output' },
    ]);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commandHistory, currentField]);

  function handleTerminalClick() {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  const handleCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    const userPrompt = user?.email
      ? `${(profile?.github_username || user.email.split('@')[0])}@gronckle:~$`
      : 'visitor@gronckle:~$';

    const cmdEntry: CommandLine = {
      id: `cmd-${Date.now()}`,
      prompt: userPrompt,
      input: cmd.trim() || '',
      type: 'input',
    };

    // Save to input history
    if (trimmed) {
      setInputHistory(prev => [cmd.trim(), ...prev.slice(0, 49)]);
      setHistoryIndex(-1);
    }

    if (!trimmed) {
      setCommandHistory(prev => [...prev, cmdEntry]);
      setCommandInput('');
      return;
    }

    let output: CommandLine;

    switch (trimmed) {
      case 'help':
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: HELP_TEXT,
          type: 'output',
          colored: true,
        };
        break;

      case 'clear':
        setCommandHistory([]);
        setCommandInput('');
        return;

      case 'about':
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: ABOUT_TEXT,
          type: 'output',
        };
        break;

      case 'donate':
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: 'Support Gronckle:',
          type: 'output',
          isDonate: true,
        };
        break;

      case 'version':
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: 'GRONCKLE Terminal v5.0.0 (Production Release)\nBuilt with React 19 + TypeScript + Vite 7 + Supabase + Deno',
          type: 'output',
        };
        break;

      case 'whoami':
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: user
            ? `Authenticated User: ${profile?.display_name || user.email}\nGitHub Handle: @${profile?.github_username || 'connected'}\nRole: ${profile?.role || 'builder'}`
            : 'visitor (Not signed in — use "Sign in with GitHub" in the top bar to connect your profile)',
          type: 'success',
        };
        break;

      case 'discord':
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: 'Join the Gronckle Dragon community on Discord:\n👉 https://discord.gg/gronckle\nShare hidden tools, discuss architectures, and build together.',
          type: 'success',
        };
        break;

      case 'changelog':
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: `GRONCKLE RELEASES:
• v5.0.0 (Latest) — Public Launch, Open Source MIT, Discord, Newsletter, & Docs
• v4.0.0 — pgvector Cosine Search ("Similar Stacks"), Community Submissions & Webhook
• v3.0.0 — Cmd+K Palette, User Profile Page, Saved Stacks, Bookmarking
• v2.0.0 — AI Oracle Stack Generator (Claude / GPT), Live Stars Proxy, Export
• v1.0.0 — Core Foundation, Supabase PostgreSQL, GitHub OAuth Auth`,
          type: 'output',
        };
        break;

      case 'contact':
      case 'message':
      case 'msg':
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: 'Starting contact form. Enter your details below.',
          type: 'success',
        };
        setCommandHistory(prev => [...prev, cmdEntry, output]);
        setCurrentField('name');
        setCommandInput('');
        return;

      case 'den':
      case 'smelt':
      case 'stash':
      case 'cave':
      case 'intel':
      case 'forge':
      case 'source':
      case 'terminal':
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: `Navigate to "${trimmed}" using the navbar above.`,
          type: 'output',
        };
        break;

      default:
        output = {
          id: `out-${Date.now()}`,
          prompt: '',
          output: `command not found: ${trimmed}\nType "help" for available commands.`,
          type: 'error',
        };
        break;
    }

    setCommandHistory(prev => [...prev, cmdEntry, output]);
    setCommandInput('');
  }, []);

  function handleCommandKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleCommand(commandInput);
      return;
    }

    // Tab completion
    if (e.key === 'Tab') {
      e.preventDefault();
      const partial = commandInput.trim().toLowerCase();
      if (!partial) return;
      const matches = AVAILABLE_COMMANDS.filter(cmd => cmd.startsWith(partial));
      if (matches.length === 1) {
        setCommandInput(matches[0]);
      } else if (matches.length > 1) {
        // Show possible completions
        const cmdEntry: CommandLine = {
          id: `cmd-${Date.now()}`,
          prompt: 'visitor@gronckle:~$',
          input: commandInput,
          type: 'input',
        };
        const suggestions: CommandLine = {
          id: `sug-${Date.now()}`,
          prompt: '',
          output: matches.join('  '),
          type: 'output',
        };
        setCommandHistory(prev => [...prev, cmdEntry, suggestions]);
      }
      return;
    }

    // Arrow up — previous command
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (inputHistory.length === 0) return;
      const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
      setHistoryIndex(newIndex);
      setCommandInput(inputHistory[newIndex]);
      return;
    }

    // Arrow down — next command
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setCommandInput('');
        return;
      }
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCommandInput(inputHistory[newIndex]);
      return;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const submitCmd: CommandLine = {
      id: `cmd-${Date.now()}`,
      prompt: 'visitor@gronckle:~$',
      input: 'send_message',
      type: 'input',
    };
    setCommandHistory(prev => [...prev, submitCmd]);

    try {
      await submitToInbox({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

      const successOutput: CommandLine = {
        id: `out-${Date.now()}`,
        prompt: '',
        output: 'Message sent successfully! We will get back to you soon.',
        type: 'success',
      };
      setCommandHistory(prev => [...prev, successOutput]);
      setIsSubmitted(true);
      setCurrentField('submit');
    } catch {
      const errorOutput: CommandLine = {
        id: `err-${Date.now()}`,
        prompt: '',
        output: 'Error: Failed to send message. Please try again.',
        type: 'error',
      };
      setCommandHistory(prev => [...prev, errorOutput]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFieldSubmit(field: 'name' | 'email' | 'message', value: string) {
    if (!value.trim()) return;

    const cmd: CommandLine = {
      id: `cmd-${Date.now()}`,
      prompt: 'visitor@gronckle:~$',
      input: field === 'name' ? `name: ${value}` : field === 'email' ? `email: ${value}` : `message: ${value.substring(0, 40)}...`,
      type: 'input',
    };

    setCommandHistory(prev => [...prev, cmd]);

    if (field === 'name') {
      setCurrentField('email');
    } else if (field === 'email') {
      setCurrentField('message');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, field: 'name' | 'email' | 'message') {
    if (e.key === 'Enter') {
      const value = field === 'name' ? name : field === 'email' ? email : message;
      handleFieldSubmit(field, value);
    }
  }

  function renderOutput(cmd: CommandLine) {
    if (cmd.isDonate) {
      return (
        <div className="mt-2 space-y-4">
          <div className="flex flex-col space-y-2">
            <a 
              href="https://buymeacoffee.com/lithish" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-fit text-white/60 hover:text-white transition-colors relative group"
            >
              [Buy Me a Coffee]
              <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-white/20 group-hover:bg-white/60 transition-colors"></span>
            </a>
            
            <a 
              href="https://github.com/sponsors/lithish" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-fit text-white/60 hover:text-white transition-colors relative group"
            >
              [GitHub Sponsors]
              <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-white/20 group-hover:bg-white/60 transition-colors"></span>
            </a>
          </div>

          <div className="pt-2">
            <span className="text-white/40 block mb-1">BTC Wallet:</span>
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 select-all">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
                  const btn = document.getElementById('btc-copy-btn');
                  if (btn) {
                    btn.textContent = '[Copied!]';
                    setTimeout(() => {
                      if (btn) btn.textContent = '[Copy]';
                    }, 2000);
                  }
                }}
                id="btc-copy-btn"
                className="text-white/40 hover:text-white transition-colors relative group"
              >
                [Copy]
                <span className="absolute -bottom-0.5 left-0 w-full h-[1px] bg-white/20 group-hover:bg-white/60 transition-colors"></span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!cmd.output) return null;

    // Colored help output — highlight command names
    if (cmd.colored) {
      return (
        <div className="mt-0.5 whitespace-pre-wrap text-white/60">
          {cmd.output.split('\n').map((line, i) => {
            // Match lines like "  help      — description"
            const match = line.match(/^(\s+)(\w+)(\s+—\s+.*)$/);
            if (match) {
              return (
                <div key={i}>
                  {match[1]}
                  <span className="text-cyan-400">{match[2]}</span>
                  <span className="text-white/40">{match[3]}</span>
                </div>
              );
            }
            return <div key={i}>{line || '\u00A0'}</div>;
          })}
        </div>
      );
    }

    return (
      <div className={`mt-0.5 whitespace-pre-wrap ${cmd.type === 'error' ? 'text-red-400' :
          cmd.type === 'success' ? 'text-green-400' :
            'text-white/60'
        }`}>
        {cmd.output.split('\n').map((line, i) => (
          <div key={i}>{line || '\u00A0'}</div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">The Cave</h1>
          <p className="text-white/50 text-sm">Enter the dragon's sanctum. Get in touch or explore commands.</p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Terminal */}
          <div>
            <div className="border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
              {/* Terminal Header */}
              <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-2.5 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70 hover:bg-yellow-500 transition-colors cursor-pointer" />
                <div className="w-3 h-3 rounded-full bg-green-500/70 hover:bg-green-500 transition-colors cursor-pointer" />
                <span className="ml-4 text-white/30 text-xs tracking-wider">cave.sh — bash</span>
              </div>

              {/* Terminal Body */}
              <div
                ref={terminalRef}
                className="p-4 h-[450px] overflow-y-auto text-sm cursor-text"
                style={{ background: '#0d0d0d' }}
                onClick={handleTerminalClick}
              >
                {/* Command History */}
                {commandHistory.map((cmd) => (
                  <div key={cmd.id} className="mb-1 leading-relaxed">
                    {cmd.prompt && (
                      <span className="text-green-400 font-bold">{cmd.prompt} </span>
                    )}
                    {cmd.input !== undefined && (
                      <span className="text-white">{cmd.input}</span>
                    )}
                    {renderOutput(cmd)}
                  </div>
                ))}

                {/* Command Input (default mode) */}
                {currentField === 'command' && !isSubmitted && (
                  <div className="flex items-center mt-1">
                    <span className="text-green-400 font-bold mr-2">visitor@gronckle:~$</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                      onKeyDown={handleCommandKeyDown}
                      autoFocus
                      className="flex-1 bg-transparent text-white border-none outline-none caret-green-400"
                    />
                    <span
                      className="inline-block w-2 h-4 bg-green-400 ml-0.5"
                      style={{ animation: 'terminal-blink 1s step-end infinite' }}
                    />
                  </div>
                )}

                {/* Contact Form Fields */}
                {currentField !== 'command' && !isSubmitted && (
                  <form onSubmit={handleSubmit} className="mt-2 space-y-1">
                    {currentField === 'name' && (
                      <div className="flex items-center">
                        <span className="text-green-400 font-bold mr-2">visitor@gronckle:~$</span>
                        <span className="text-cyan-400/70 mr-2">name:</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, 'name')}
                          placeholder="your_name"
                          autoFocus
                          className="flex-1 bg-transparent text-white border-none outline-none placeholder:text-white/20 caret-green-400"
                        />
                        <span
                          className="inline-block w-2 h-4 bg-green-400 ml-0.5"
                          style={{ animation: 'terminal-blink 1s step-end infinite' }}
                        />
                      </div>
                    )}

                    {currentField === 'email' && (
                      <div className="flex items-center">
                        <span className="text-green-400 font-bold mr-2">visitor@gronckle:~$</span>
                        <span className="text-cyan-400/70 mr-2">email:</span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, 'email')}
                          placeholder="your@email.com"
                          autoFocus
                          className="flex-1 bg-transparent text-white border-none outline-none placeholder:text-white/20 caret-green-400"
                        />
                        <span
                          className="inline-block w-2 h-4 bg-green-400 ml-0.5"
                          style={{ animation: 'terminal-blink 1s step-end infinite' }}
                        />
                      </div>
                    )}

                    {currentField === 'message' && (
                      <div>
                        <div className="flex items-center">
                          <span className="text-green-400 font-bold mr-2">visitor@gronckle:~$</span>
                          <span className="text-cyan-400/70 mr-2">message:</span>
                        </div>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type your message here..."
                          rows={5}
                          autoFocus
                          className="w-full mt-1 bg-transparent text-white border-none outline-none placeholder:text-white/20 resize-none caret-green-400 leading-relaxed"
                        />
                        <button
                          type="submit"
                          disabled={!name.trim() || !email.trim() || !message.trim() || isSubmitting}
                          className="mt-3 flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 hover:border-green-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmitting ? 'sending...' : './send_message.sh'}</span>
                        </button>
                      </div>
                    )}
                  </form>
                )}

                {isSubmitted && (
                  <div className="flex items-center mt-2">
                    <span className="text-green-400 font-bold mr-2">visitor@gronckle:~$</span>
                    <span className="text-white/40 text-xs">message delivered ✓</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
