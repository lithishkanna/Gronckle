import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tool } from '@/types/database';
import { getMaintenanceStatus } from '@/lib/filters';
import {
  Star,
  Scale,
  Activity,
  Server,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Layers,
  Code2,
  Share2,
  Check,
} from 'lucide-react';

interface ToolDetailPageProps {
  slug: string;
  onBack: () => void;
  onSelectForStack?: (tool: Tool) => void;
}

// Generate dynamic Open Graph SVG Data URL
function generateOgImageSvg(tool: Tool): string {
  const title = (tool.title || 'Tool').replace(/[<>&"']/g, '');
  const desc = (tool.description || '').slice(0, 100).replace(/[<>&"']/g, '');
  const stars = tool.stars ? `${(tool.stars / 1000).toFixed(1)}k stars` : 'Open Source';
  const lic = tool.license || 'Permissive';

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#0A0A0A"/>
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0.1"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#grad)"/>
    <rect x="60" y="60" width="1080" height="510" rx="24" fill="#141414" stroke="#262626" stroke-width="2"/>
    <text x="100" y="140" fill="#3B82F6" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" letter-spacing="2">GRONCKLE TOOL INTELLIGENCE</text>
    <text x="100" y="240" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="64" font-weight="bold">${title}</text>
    <text x="100" y="310" fill="#A3A3A3" font-family="system-ui, sans-serif" font-size="28">${desc}...</text>
    <rect x="100" y="420" width="180" height="50" rx="12" fill="#262626"/>
    <text x="125" y="454" fill="#FBBF24" font-family="system-ui, sans-serif" font-size="22" font-weight="bold">★ ${stars}</text>
    <rect x="300" y="420" width="180" height="50" rx="12" fill="#262626"/>
    <text x="325" y="454" fill="#60A5FA" font-family="system-ui, sans-serif" font-size="22" font-weight="bold">⚖ ${lic}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function ToolDetailPage({ slug, onBack, onSelectForStack }: ToolDetailPageProps) {
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchTool() {
      setLoading(true);
      try {
        const safeSlug = slug.replace(/[(),."'\\]/g, '').trim();
        const { data, error } = await supabase
          .from('tools')
          .select('*')
          .or(`slug.eq.${safeSlug},title.ilike.${safeSlug}`)
          .limit(1)
          .single();

        if (!error && data) {
          setTool(data as Tool);

          // Update Document Title and SEO Meta Tags
          document.title = `${data.title} — Gronckle Tools`;

          const ogImage = generateOgImageSvg(data as Tool);

          // Update or inject SEO meta tags
          const updateMeta = (nameOrProperty: string, content: string) => {
            let el = document.querySelector(`meta[name="${nameOrProperty}"], meta[property="${nameOrProperty}"]`);
            if (!el) {
              el = document.createElement('meta');
              if (nameOrProperty.startsWith('og:')) {
                el.setAttribute('property', nameOrProperty);
              } else {
                el.setAttribute('name', nameOrProperty);
              }
              document.head.appendChild(el);
            }
            el.setAttribute('content', content);
          };

          updateMeta('description', data.description || `${data.title} open source developer tool.`);
          updateMeta('og:title', `${data.title} — Gronckle`);
          updateMeta('og:description', data.description || `${data.title} developer tool on Gronckle.`);
          updateMeta('og:image', ogImage);
          updateMeta('og:type', 'article');
          updateMeta('twitter:card', 'summary_large_image');
        }
      } catch (err) {
        console.error('Failed to fetch tool:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTool();

    return () => {
      document.title = 'GRONCKLE — Hoard the Best. Build the Rest.';
    };
  }, [slug]);

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
          <span className="text-white/40 text-xs font-mono uppercase tracking-widest">
            Loading Tool Dossier...
          </span>
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen pt-28 pb-16 max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Tool Not Found</h2>
        <p className="text-white/50 text-sm mb-6">
          No tool matching &ldquo;{slug}&rdquo; is currently recorded in Gronckle&rsquo;s database.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Vault
        </button>
      </div>
    );
  }

  const maint = getMaintenanceStatus(tool.last_commit_date);

  return (
    <article className="min-h-screen pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="text-white/50 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Vault</span>
        </button>
        <button
          onClick={handleShare}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs border border-white/10 transition-colors flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copied ? 'Link Copied!' : 'Share Tool'}</span>
        </button>
      </div>

      {/* Hero Header */}
      <div className="p-8 rounded-3xl bg-[#121212] border border-white/10 shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>{tool.category || 'Developer Tool'}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {tool.title}
            </h1>
            {tool.slug && (
              <span className="text-xs font-mono text-white/40 block mt-1">@{tool.slug}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all flex items-center gap-2"
            >
              <span>Visit Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {onSelectForStack && (
              <button
                onClick={() => onSelectForStack(tool)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Build Stack With This</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-base text-white/70 mt-6 leading-relaxed max-w-3xl">
          {tool.description}
        </p>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-8 border-t border-white/10">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] uppercase font-bold text-white/40 flex items-center gap-1.5 mb-1">
              <Star className="w-3.5 h-3.5 text-yellow-400" /> Stars
            </div>
            <span className="text-lg font-bold text-white font-mono">
              {tool.stars ? tool.stars.toLocaleString() : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] uppercase font-bold text-white/40 flex items-center gap-1.5 mb-1">
              <Scale className="w-3.5 h-3.5 text-blue-400" /> License
            </div>
            <span className="text-lg font-bold text-white truncate block">
              {tool.license || 'Open Source'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] uppercase font-bold text-white/40 flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Maintenance
            </div>
            <span className="text-lg font-bold text-white capitalize">
              {maint}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[11px] uppercase font-bold text-white/40 flex items-center gap-1.5 mb-1">
              <Server className="w-3.5 h-3.5 text-purple-400" /> Deployment
            </div>
            <span className="text-lg font-bold text-white">
              {tool.self_hostable ? 'Self-Hostable' : 'Cloud / Hosted'}
            </span>
          </div>
        </div>
      </div>

      {/* Technical Details & Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Languages & Frameworks */}
        <div className="p-6 rounded-2xl bg-[#111] border border-white/10">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-400" /> Ecosystem & Stack
          </h2>
          <div className="space-y-4">
            <div>
              <span className="text-xs text-white/40 block mb-2 font-medium">Primary Languages</span>
              <div className="flex flex-wrap gap-1.5">
                {(tool.languages && tool.languages.length > 0 ? tool.languages : ['Multi-language']).map(l => (
                  <span key={l} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80">
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {tool.frameworks && tool.frameworks.length > 0 && (
              <div>
                <span className="text-xs text-white/40 block mb-2 font-medium">Frameworks & Integrations</span>
                <div className="flex flex-wrap gap-1.5">
                  {tool.frameworks.map(f => (
                    <span key={f} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tags & Use Cases */}
        <div className="p-6 rounded-2xl bg-[#111] border border-white/10">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" /> Domain Tags & Capabilities
          </h2>
          <div className="flex flex-wrap gap-2">
            {[...(tool.tags || []), ...(tool.use_cases || [])].map(tag => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
