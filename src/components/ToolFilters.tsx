import { useState } from 'react';
import type { FilterState, FilterCounts } from '@/lib/filters';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Sparkles,
  Layers,
  Code2,
  Scale,
  DollarSign,
  Server,
  Activity,
  Star,
  Tag,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ToolFiltersProps {
  filters: FilterState;
  counts: FilterCounts;
  totalFiltered: number;
  totalAll: number;
  onChange: (updated: Partial<FilterState>) => void;
  onReset: () => void;
}

const COMMON_CATEGORIES = [
  'frontend',
  'backend',
  'database',
  'auth',
  'devops',
  'ai-ml',
  'security',
  'testing',
  'analytics',
  'documentation',
];

const COMMON_LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go'];
const COMMON_FRAMEWORKS = ['React', 'Next.js', 'Vue', 'Svelte', 'FastAPI', 'Node'];
const COMMON_LICENSES = [
  { label: 'Any Open Source', value: 'any-oss' },
  { label: 'MIT', value: 'MIT' },
  { label: 'Apache-2.0', value: 'Apache-2.0' },
  { label: 'GPL-3.0', value: 'GPL-3.0' },
];

const STACK_PRESETS = ['React', 'Next.js', 'TypeScript', 'Node', 'Python', 'Rust', 'Postgres', 'FastAPI'];

export function ToolFilters({
  filters,
  counts,
  totalFiltered,
  totalAll,
  onChange,
  onReset,
}: ToolFiltersProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Collect active filters for chips
  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (filters.category !== 'all') {
    activeChips.push({
      key: `cat-${filters.category}`,
      label: `Category: ${filters.category}`,
      onRemove: () => onChange({ category: 'all' }),
    });
  }

  filters.languages.forEach(lang => {
    activeChips.push({
      key: `lang-${lang}`,
      label: `Lang: ${lang}`,
      onRemove: () => onChange({ languages: filters.languages.filter(l => l !== lang) }),
    });
  });

  filters.frameworks.forEach(fw => {
    activeChips.push({
      key: `fw-${fw}`,
      label: `Works with: ${fw}`,
      onRemove: () => onChange({ frameworks: filters.frameworks.filter(f => f !== fw) }),
    });
  });

  if (filters.license !== 'all') {
    activeChips.push({
      key: `lic-${filters.license}`,
      label: `License: ${filters.license}`,
      onRemove: () => onChange({ license: 'all' }),
    });
  }

  if (filters.pricing !== 'all') {
    activeChips.push({
      key: `price-${filters.pricing}`,
      label: `Pricing: ${filters.pricing}`,
      onRemove: () => onChange({ pricing: 'all' }),
    });
  }

  if (filters.selfHostable !== null) {
    activeChips.push({
      key: 'selfhost',
      label: filters.selfHostable ? 'Self-Hostable' : 'Cloud Only',
      onRemove: () => onChange({ selfHostable: null }),
    });
  }

  if (filters.type !== 'all') {
    activeChips.push({
      key: `type-${filters.type}`,
      label: `Type: ${filters.type}`,
      onRemove: () => onChange({ type: 'all' }),
    });
  }

  if (filters.maintenance !== 'all') {
    activeChips.push({
      key: `maint-${filters.maintenance}`,
      label: `Status: ${filters.maintenance}`,
      onRemove: () => onChange({ maintenance: 'all' }),
    });
  }

  if (filters.minStars > 0) {
    activeChips.push({
      key: 'stars',
      label: `Stars ≥ ${filters.minStars.toLocaleString()}`,
      onRemove: () => onChange({ minStars: 0 }),
    });
  }

  filters.tags.forEach(tag => {
    activeChips.push({
      key: `tag-${tag}`,
      label: `#${tag}`,
      onRemove: () => onChange({ tags: filters.tags.filter(t => t !== tag) }),
    });
  });

  filters.myStack.forEach(item => {
    activeChips.push({
      key: `stack-${item}`,
      label: `My Stack: ${item}`,
      onRemove: () => onChange({ myStack: filters.myStack.filter(s => s !== item) }),
    });
  });

  // Toggle multi-select helper
  const toggleArrayItem = (current: string[], item: string, key: 'languages' | 'frameworks' | 'tags' | 'myStack') => {
    const next = current.includes(item) ? current.filter(x => x !== item) : [...current, item];
    onChange({ [key]: next });
  };

  const renderFilterControls = () => (
    <div className="flex flex-col gap-6 text-sm text-gray-300">
      {/* Works with my stack */}
      <div className="bg-[#FF6B2B]/5 border border-[#FF6B2B]/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2 font-semibold text-white text-xs uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#FF6B2B]" />
          Works with my stack
        </div>
        <p className="text-xs text-white/50 mb-3">Pick your tools to filter for compatible technologies</p>
        <div className="flex flex-wrap gap-1.5">
          {STACK_PRESETS.map(preset => {
            const active = filters.myStack.includes(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => toggleArrayItem(filters.myStack, preset, 'myStack')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#FF6B2B] text-white shadow-lg shadow-[#FF6B2B]/30'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {active && <Check className="w-3 h-3 inline mr-1" />}
                {preset}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category */}
      <div>
        <div className="flex items-center justify-between mb-2 font-semibold text-xs text-white uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-white/50" /> Category</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ category: 'all' })}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
              filters.category === 'all'
                ? 'bg-white text-black font-semibold'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            All ({totalAll})
          </button>
          {COMMON_CATEGORIES.map(cat => {
            const count = counts.categories[cat] || 0;
            const active = filters.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onChange({ category: active ? 'all' : cat })}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  active
                    ? 'bg-[#FF6B2B] text-white font-semibold'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span>{cat}</span>
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Languages & Frameworks */}
      <div>
        <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-white uppercase tracking-wider">
          <Code2 className="w-3.5 h-3.5 text-white/50" /> Languages & Frameworks
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_LANGUAGES.map(lang => {
            const count = counts.languages[lang] || 0;
            const active = filters.languages.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleArrayItem(filters.languages, lang, 'languages')}
                className={`px-2 py-0.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  active
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span>{lang}</span>
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
          {COMMON_FRAMEWORKS.map(fw => {
            const count = counts.frameworks[fw] || 0;
            const active = filters.frameworks.includes(fw);
            return (
              <button
                key={fw}
                type="button"
                onClick={() => toggleArrayItem(filters.frameworks, fw, 'frameworks')}
                className={`px-2 py-0.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                  active
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span>{fw}</span>
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing & License */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pricing */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-white uppercase tracking-wider">
            <DollarSign className="w-3.5 h-3.5 text-white/50" /> Pricing
          </div>
          <select
            value={filters.pricing}
            onChange={e => onChange({ pricing: e.target.value })}
            className="w-full bg-[#161616] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FF6B2B]"
          >
            <option value="all">Any Pricing</option>
            <option value="open source">Open Source ({counts.pricing['open source'] || 0})</option>
            <option value="free tier">Free Tier ({counts.pricing['free tier'] || 0})</option>
            <option value="paid">Paid ({counts.pricing['paid'] || 0})</option>
          </select>
        </div>

        {/* License */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-white uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5 text-white/50" /> License
          </div>
          <select
            value={filters.license}
            onChange={e => onChange({ license: e.target.value })}
            className="w-full bg-[#161616] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FF6B2B]"
          >
            <option value="all">Any License</option>
            {COMMON_LICENSES.map(l => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Self-Hostable & Maintenance */}
      <div className="grid grid-cols-2 gap-4">
        {/* Self Hostable */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-white uppercase tracking-wider">
            <Server className="w-3.5 h-3.5 text-white/50" /> Hosting
          </div>
          <select
            value={filters.selfHostable === null ? 'all' : String(filters.selfHostable)}
            onChange={e => {
              const val = e.target.value;
              onChange({ selfHostable: val === 'all' ? null : val === 'true' });
            }}
            className="w-full bg-[#161616] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FF6B2B]"
          >
            <option value="all">Any Hosting</option>
            <option value="true">Self-Hostable</option>
            <option value="false">Cloud / SaaS Only</option>
          </select>
        </div>

        {/* Maintenance */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-white uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-white/50" /> Maintenance
          </div>
          <select
            value={filters.maintenance}
            onChange={e => onChange({ maintenance: e.target.value })}
            className="w-full bg-[#161616] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FF6B2B]"
          >
            <option value="all">Any Activity</option>
            <option value="active">Active (≤ 3m) ({counts.maintenance.active || 0})</option>
            <option value="slowing">Slowing (3-12m) ({counts.maintenance.slowing || 0})</option>
            <option value="abandoned">Dormant (&gt; 12m) ({counts.maintenance.abandoned || 0})</option>
          </select>
        </div>
      </div>

      {/* Type & Stars */}
      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-white uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-white/50" /> Type
          </div>
          <select
            value={filters.type}
            onChange={e => onChange({ type: e.target.value })}
            className="w-full bg-[#161616] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FF6B2B]"
          >
            <option value="all">Any Type</option>
            <option value="repo">Repository</option>
            <option value="library">Library / Package</option>
            <option value="service">Service / Backend</option>
            <option value="website">Website / Portal</option>
          </select>
        </div>

        {/* Stars */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-white uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 text-white/50" /> Stars Range
          </div>
          <select
            value={filters.minStars}
            onChange={e => onChange({ minStars: Number(e.target.value) })}
            className="w-full bg-[#161616] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#FF6B2B]"
          >
            <option value={0}>Any Stars</option>
            <option value={500}>≥ 500 stars</option>
            <option value={1000}>≥ 1,000 stars</option>
            <option value={5000}>≥ 5,000 stars</option>
            <option value={10000}>≥ 10,000 stars</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full mb-6">
      {/* Top Filter Bar (Search + Sort + Drawer Trigger) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Active Filter Chips & Clear All */}
        <div className="flex-1 flex flex-wrap items-center gap-1.5">
          {activeChips.length > 0 ? (
            <>
              {activeChips.map(chip => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs border border-white/10"
                >
                  <span>{chip.label}</span>
                  <button
                    onClick={chip.onRemove}
                    className="hover:text-[#FF6B2B] transition-colors p-0.5 -mr-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={onReset}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs border border-red-500/20 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Clear All
              </button>
            </>
          ) : (
            <span className="text-xs text-white/40 flex items-center gap-1.5 font-mono">
              <Tag className="w-3.5 h-3.5" /> Showing all {totalFiltered} vault entries
            </span>
          )}
        </div>

        {/* Controls: Mobile Drawer Button + Sort Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6B2B]" />
            <span>Filters {activeChips.length > 0 && `(${activeChips.length})`}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-[#161616] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white">
            <ArrowUpDown className="w-3.5 h-3.5 text-white/40" />
            <select
              value={filters.sort}
              onChange={e => onChange({ sort: e.target.value as FilterState['sort'] })}
              className="bg-transparent text-white outline-none cursor-pointer"
            >
              <option value="best" className="bg-[#111]">Best Match</option>
              <option value="updated" className="bg-[#111]">Recently Updated</option>
              <option value="stars_desc" className="bg-[#111]">Most Starred</option>
              <option value="stars_asc" className="bg-[#111]">Least Starred (Underrated)</option>
              <option value="newest" className="bg-[#111]">Newest Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Filter Panel */}
      <div className="hidden lg:block bg-[#111]/60 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
        {renderFilterControls()}
      </div>

      {/* Mobile Filter Drawer */}
      <Dialog open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <DialogContent className="bg-[#111] border border-white/10 rounded-3xl text-white max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#FF6B2B]" />
                Filter Vault Tools
              </DialogTitle>
              {activeChips.length > 0 && (
                <button
                  onClick={onReset}
                  className="text-xs text-red-400 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="py-2">
            {renderFilterControls()}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#FF6B2B] text-white text-sm font-semibold hover:bg-[#FF6B2B]/90 transition-colors"
            >
              Apply Filters ({totalFiltered} results)
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
