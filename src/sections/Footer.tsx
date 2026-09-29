import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Github, Twitter, Heart, ExternalLink, Check, Flame } from 'lucide-react';
import { ChangelogModal } from '@/components/ChangelogModal';
import { toast } from 'sonner';

export function Footer() {
    const [email, setEmail] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [changelogOpen, setChangelogOpen] = useState(false);

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed || !trimmed.includes('@')) {
            toast.error('Please enter a valid email address.');
            return;
        }

        try {
            // Save subscriber in localStorage as fallback/cache
            const subs = JSON.parse(localStorage.getItem('gronckle_subscribers') || '[]');
            if (!subs.includes(trimmed)) {
                subs.push(trimmed);
                localStorage.setItem('gronckle_subscribers', JSON.stringify(subs));
            }
        } catch {
            // ignore
        }

        setIsSubscribed(true);
        setEmail('');
        toast.success('The dragon has noted your email. Expect Den dispatches weekly!', {
            icon: '🐲',
        });
    };

    return (
        <footer className="border-t border-[#1A1A1A] bg-black">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-2.5 mb-5">
                            <Logo className="w-10 h-10 text-white opacity-90" />
                            <div className="flex flex-col">
                                <span
                                    className="text-white font-bold text-lg uppercase tracking-[0.12em]"
                                    style={{ fontFamily: "'Geist Mono', 'JetBrains Mono', monospace" }}
                                >
                                    GRONCKLE
                                </span>
                                <span
                                    className="text-white/25 text-[8px] uppercase tracking-[0.25em] leading-none mt-0.5"
                                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                    Hoard the Best. Build the Rest.
                                </span>
                            </div>
                        </div>
                        <p className="text-white/30 text-sm leading-relaxed mb-5">
                            The dragon's vault of curated developer tools.<br />
                            Hoard the best. Build the rest.
                        </p>
                        {/* Social icons */}
                        <div className="flex items-center gap-3">
                            <a
                                href="https://github.com/lithish/gronckle"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 border border-[#1A1A1A] rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all"
                                aria-label="GitHub"
                            >
                                <Github className="w-4 h-4" />
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 border border-[#1A1A1A] rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all"
                                aria-label="Twitter"
                            >
                                <Twitter className="w-4 h-4" />
                            </a>
                            <a
                                href="https://discord.gg/gronckle"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 border border-[#1A1A1A] rounded-xl flex items-center justify-center text-white/40 hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all"
                                aria-label="Discord"
                            >
                                <Flame className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Navigate */}
                    <div>
                        <h4
                            className="text-white/50 text-xs uppercase tracking-widest mb-4"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                            Navigate
                        </h4>
                        <div className="space-y-2.5 text-sm">
                            <div className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">The Den</div>
                            <div className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">The Smelt</div>
                            <div className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">The Stash</div>
                            <div className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">The Cave</div>
                        </div>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4
                            className="text-white/50 text-xs uppercase tracking-widest mb-4"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                            Resources
                        </h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="https://github.com/lithish/gronckle#readme" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors">
                                Documentation
                                <ExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                            <button
                                onClick={() => setChangelogOpen(true)}
                                className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                            >
                                <span>Changelog</span>
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20">v5.0</span>
                            </button>
                            <a href="https://github.com/lithish/gronckle/issues" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors">
                                Status & Issues
                                <ExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                        </div>
                    </div>

                    {/* Built With & Community */}
                    <div>
                        <h4
                            className="text-white/50 text-xs uppercase tracking-widest mb-4"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                            Built With
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {['React 19', 'Vite 7', 'Supabase', 'pgvector', 'Tailwind', 'Deno'].map((tech) => (
                                <span
                                    key={tech}
                                    className="text-xs text-white/20 px-2 py-1 border border-[#1A1A1A] rounded-md hover:text-white/40 hover:border-white/15 transition-colors"
                                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>

                        <h4
                            className="text-white/50 text-xs uppercase tracking-widest mb-4"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                            Community
                        </h4>
                        <div className="space-y-2.5 text-sm">
                            <a href="https://discord.gg/gronckle" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#FF6B2B]/80 hover:text-[#FF6B2B] transition-colors font-medium">
                                Discord Community
                                <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                            <a href="https://github.com/lithish/gronckle" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors">
                                GitHub Repository
                                <ExternalLink className="w-3 h-3 opacity-50" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Newsletter / CTA Section */}
                <div className="mt-10 p-6 rounded-2xl bg-white/[0.02] border border-white/10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <h4
                                className="text-white/80 font-semibold text-sm mb-1"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                                Let Gronckle do the digging
                            </h4>
                            <p className="text-white/30 text-xs">The dragon sniffs out new tools so you don't have to.</p>
                        </div>
                        <form onSubmit={handleNewsletterSubmit} className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={isSubscribed ? "Subscribed!" : "you@email.com"}
                                disabled={isSubscribed}
                                className="flex-1 sm:w-56 bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2B]/40 transition-colors"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            />
                            <button
                                type="submit"
                                disabled={isSubscribed}
                                className="px-5 py-2.5 bg-[#FF6B2B] text-white font-semibold text-sm rounded-xl hover:bg-[#FF6B2B]/90 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shadow-lg shadow-[#FF6B2B]/20 disabled:opacity-60 flex items-center gap-1.5"
                            >
                                {isSubscribed ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>Noted!</span>
                                    </>
                                ) : (
                                    <span>Wake the Dragon</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-10 pt-6 border-t border-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p
                        className="text-white/20 text-xs flex items-center gap-1.5"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                        © {new Date().getFullYear()} lithish. MIT Licensed.
                        <Heart className="w-3 h-3 text-red-400/60 inline" />
                        Made for builders.
                    </p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setChangelogOpen(true)}
                            className="text-white/30 hover:text-white transition-colors text-xs font-mono"
                        >
                            Changelog
                        </button>
                        <span className="w-px h-3 bg-white/10" />
                        <a
                            href="https://github.com/lithish/gronckle/blob/main/LICENSE"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/20 hover:text-white/50 transition-colors text-xs"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                            License
                        </a>
                        <span className="w-px h-3 bg-white/10" />
                        <a
                            href="https://github.com/lithish/gronckle"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/20 hover:text-white/50 transition-colors text-xs"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                            GitHub
                        </a>
                        <span className="w-px h-3 bg-white/10" />
                        <button
                            onClick={() => setChangelogOpen(true)}
                            className="text-[#FF6B2B]/80 hover:text-[#FF6B2B] text-xs font-mono transition-colors"
                        >
                            v5.0.0
                        </button>
                    </div>
                </div>
            </div>

            {/* Changelog Modal */}
            <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} />
        </footer>
    );
}
