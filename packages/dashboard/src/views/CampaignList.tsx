import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCampaigns } from '../hooks/useCampaigns.js';
import SearchBar from '../components/SearchBar.js';
import AddCampaignForm from '../components/AddCampaignForm.js';
import { Button } from '../components/FormField.js';
import type { CampaignWithStats } from '@mycelio/shared';

const statusStyles: Record<string, string> = {
  draft: 'text-white/40 border-white/10 bg-white/5',
  active: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  paused: 'text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10',
  completed: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  archived: 'text-white/20 border-white/5 bg-white/[0.03]',
};

const typeStyles: Record<string, string> = {
  outreach: 'text-neon-cyan/60',
  nurture: 'text-neon-green/60',
  event: 'text-neon-magenta/60',
  recruitment: 'text-neon-yellow/60',
  other: 'text-white/40',
};

export default function CampaignList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const params: Record<string, string> = {};
  if (search) params.q = search;
  if (statusFilter) params.status = statusFilter;
  if (typeFilter) params.type = typeFilter;

  const { data: campaigns, isLoading, error } = useCampaigns(
    Object.keys(params).length > 0 ? params : undefined
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-wide neon-text">Campaigns</h2>
        <Button onClick={() => setShowAdd(true)}>+ New Campaign</Button>
      </div>

      <div className="flex gap-4 mb-6 items-end flex-wrap">
        <div className="max-w-xs flex-1">
          <SearchBar onSearch={setSearch} placeholder="Search campaigns..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
        >
          <option value="">All Types</option>
          <option value="outreach">Outreach</option>
          <option value="nurture">Nurture</option>
          <option value="event">Event</option>
          <option value="recruitment">Recruitment</option>
          <option value="other">Other</option>
        </select>
      </div>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      <div className="glass rounded-xl overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Members</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Contacted</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Tags</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(campaigns as CampaignWithStats[] | undefined)?.map((campaign) => (
              <tr key={campaign.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <Link to={`/campaigns/${campaign.id}`} className="text-neon-cyan hover:text-neon-cyan/80 font-medium transition-colors">
                    {campaign.name}
                  </Link>
                  {campaign.description && (
                    <p className="text-xs text-white/20 mt-0.5 truncate max-w-xs">{campaign.description}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider rounded border ${statusStyles[campaign.status]}`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm ${typeStyles[campaign.type]}`}>{campaign.type}</span>
                </td>
                <td className="px-6 py-4 text-sm text-white/40">
                  {campaign.stats?.totalMembers ?? '—'}
                </td>
                <td className="px-6 py-4 text-sm text-white/40">
                  {campaign.stats ? `${campaign.stats.contactedPercent}%` : '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap">
                    {campaign.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 text-[10px] bg-white/5 text-white/30 rounded border border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-white/30">
                  {new Date(campaign.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {campaigns?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-white/20">
                  No campaigns found. Click "+ New Campaign" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddCampaignForm open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
