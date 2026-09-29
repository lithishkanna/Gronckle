import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { submitRepo } from '@/lib/community';
import { useAuth } from '@/hooks/use-auth';

interface SubmitRepoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareMessage?: (message: string) => void;
}

export function SubmitRepoForm({ open, onOpenChange, shareMessage }: SubmitRepoFormProps) {
  const { user } = useAuth();
  const [repoUrl, setRepoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!repoUrl.startsWith('https://github.com/')) {
      setError('Repo URL must start with https://github.com/');
      return;
    }

    try {
      setLoading(true);
      await submitRepo({
        repo_url: repoUrl,
        title,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      
      if (shareMessage) {
        shareMessage('Repository submitted successfully!');
      } else {
        alert('Repository submitted successfully!');
      }
      
      setRepoUrl('');
      setTitle('');
      setDescription('');
      setTags('');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border border-white/10 rounded-3xl text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit a Repository</DialogTitle>
        </DialogHeader>
        {!user ? (
          <div className="p-6 text-center text-gray-300">
            <p>Sign in to submit</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
            {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-md">{error}</div>}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Repository URL <span className="text-red-500">*</span></label>
              <input
                type="url"
                required
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Project Name"
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description..."
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] min-h-[100px] transition-colors resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="react, typescript, ui (comma separated)"
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-[#FF6B2B] text-white py-3 rounded-xl hover:bg-[#FF6B2B]/90 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
