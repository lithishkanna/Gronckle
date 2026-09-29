import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { flagRepo } from '@/lib/community';
import { useAuth } from '@/hooks/use-auth';

interface ReportOutdatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoId: string;
  repoName: string;
  shareMessage?: (message: string) => void;
}

export function ReportOutdatedDialog({ open, onOpenChange, repoId, repoName, shareMessage }: ReportOutdatedDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<'outdated' | 'deprecated' | 'broken_link' | 'security' | 'other'>('outdated');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await flagRepo({
        repo_id: repoId,
        reason,
        details,
      });
      
      if (shareMessage) {
        shareMessage('Report submitted successfully!');
      } else {
        alert('Report submitted successfully!');
      }
      
      setDetails('');
      setReason('outdated');
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const REASONS = [
    { value: 'outdated', label: 'Outdated' },
    { value: 'deprecated', label: 'Deprecated' },
    { value: 'broken_link', label: 'Broken Link' },
    { value: 'security', label: 'Security Issue' },
    { value: 'other', label: 'Other' }
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border border-white/10 rounded-3xl text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report {repoName}</DialogTitle>
        </DialogHeader>
        {!user ? (
          <div className="p-6 text-center text-gray-300">
            <p>Sign in to report</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-4">
            {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-md">{error}</div>}
            
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-300">Reason</label>
              <div className="flex flex-col gap-3">
                {REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-3 text-sm cursor-pointer group">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value as any)}
                      className="w-4 h-4 accent-[#FF6B2B] bg-white/5 border-white/10"
                    />
                    <span className="text-gray-200 group-hover:text-white transition-colors">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Details (Optional)</label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Provide more context about why you are reporting this..."
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] min-h-[100px] transition-colors resize-none"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-[#FF6B2B] text-white py-3 rounded-xl hover:bg-[#FF6B2B]/90 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
