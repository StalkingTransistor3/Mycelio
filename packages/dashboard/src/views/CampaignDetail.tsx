import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useCampaign,
  useCampaignMembers,
  useUpdateCampaign,
  useUpdateCampaignMember,
  useRemoveCampaignMember,
  useBulkAddCampaignMembers,
} from '../hooks/useCampaigns.js';
import SearchBar from '../components/SearchBar.js';
import AddMembersModal from '../components/AddMembersModal.js';
import { Button } from '../components/FormField.js';
import type { CampaignMemberEnriched, CampaignMemberStatus } from '@mycelio/shared';

const statusStyles: Record<string, string> = {
  draft: 'text-white/40 border-white/10 bg-white/5',
  active: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  paused: 'text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10',
  completed: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  archived: 'text-white/20 border-white/5 bg-white/[0.03]',
};

const memberStatusStyles: Record<string, string> = {
  not_started: 'text-white/40 border-white/10 bg-white/5',
  contacted: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  interested: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  not_interested: 'text-red-400 border-red-400/30 bg-red-400/10',
  converted: 'text-neon-magenta border-neon-magenta/30 bg-neon-magenta/10',
  deferred: 'text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10',
};

const memberStatusOrder: CampaignMemberStatus[] = [
  'not_started', 'contacted', 'interested', 'not_interested', 'converted', 'deferred',
];

const campaignStatusOrder = ['draft', 'active', 'paused', 'completed', 'archived'];

const tierGlow: Record<number, string> = {
  1: 'text-neon-magenta border-neon-magenta/30 bg-neon-magenta/10',
  2: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  3: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  4: 'text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10',
  5: 'text-white/40 border-white/10 bg-white/5',
};

const tierLabels: Record<number, string> = {
  1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5',
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = useCampaign(id!);
  const updateCampaign = useUpdateCampaign(id!);

  // Member filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [sortBy, setSortBy] = useState('addedAt');
  const [showAddMembers, setShowAddMembers] = useState(false);

  const memberParams: Record<string, string> = {};
  if (search) memberParams.q = search;
  if (statusFilter) memberParams.status = statusFilter;
  if (tierFilter) memberParams.tier = tierFilter;
  if (sortBy) memberParams.sortBy = sortBy;
  memberParams.sortOrder = sortBy === 'name' ? 'asc' : 'desc';

  const { data: members } = useCampaignMembers(
    id!,
    Object.keys(memberParams).length > 0 ? memberParams : undefined
  );

  const updateMember = useUpdateCampaignMember(id!);
  const removeMember = useRemoveCampaignMember(id!);
  const bulkAdd = useBulkAddCampaignMembers(id!);

  const cycleCampaignStatus = () => {
    if (!campaign) return;
    const idx = campaignStatusOrder.indexOf(campaign.status);
    const next = campaignStatusOrder[(idx + 1) % campaignStatusOrder.length];
    updateCampaign.mutate({ status: next });
  };

  const cycleMemberStatus = (member: CampaignMemberEnriched) => {
    const idx = memberStatusOrder.indexOf(member.status);
    const next = memberStatusOrder[(idx + 1) % memberStatusOrder.length];
    updateMember.mutate({ memberId: member.id, data: { status: next } });
  };

  if (isLoading) return <p className="text-white/30 animate-pulse">Loading...</p>;
  if (!campaign) return <p className="text-red-400">Campaign not found</p>;

  const existingMemberIds = members?.map((m) => m.personId) || [];

  return (
    <div>
      <Link to="/campaigns" className="text-neon-cyan/60 hover:text-neon-cyan text-sm mb-4 inline-block transition-colors">
        &larr; Back to Campaigns
      </Link>

      {/* Campaign Header */}
      <div className="glass rounded-xl p-6 mb-6 neon-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold tracking-wide text-white">{campaign.name}</h2>
            {campaign.description && <p className="text-white/40 mt-1">{campaign.description}</p>}
            {campaign.goal && (
              <div className="mt-2 p-2 bg-white/5 rounded text-sm text-white/30 border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-white/20">Goal: </span>
                {campaign.goal}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/20">{campaign.type}</span>
            <button onClick={cycleCampaignStatus}>
              <span className={`px-3 py-1 text-xs font-mono rounded border cursor-pointer hover:opacity-80 transition-opacity ${statusStyles[campaign.status]}`}>
                {campaign.status}
              </span>
            </button>
          </div>
        </div>

        {/* Dates */}
        {(campaign.startDate || campaign.endDate) && (
          <div className="mt-3 flex gap-4 text-xs text-white/30">
            {campaign.startDate && <span>Start: {new Date(campaign.startDate).toLocaleDateString()}</span>}
            {campaign.endDate && <span>End: {new Date(campaign.endDate).toLocaleDateString()}</span>}
          </div>
        )}

        {/* Tags */}
        {campaign.tags.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {campaign.tags.map((tag: string) => (
              <span key={tag} className="px-2 py-1 text-xs rounded border bg-neon-purple/10 text-neon-purple/60 border-neon-purple/20">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats Bar */}
        {campaign.stats && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-lg p-3 border border-white/5 text-center">
              <div className="text-lg font-bold text-white">{campaign.stats.totalMembers}</div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Members</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/5 text-center">
              <div className="text-lg font-bold text-neon-cyan">{campaign.stats.contactedPercent}%</div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Contacted</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/5 text-center">
              <div className="text-lg font-bold text-neon-magenta">{campaign.stats.conversionRate}%</div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Converted</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/5 text-center">
              <div className="text-lg font-bold text-neon-yellow">{campaign.stats.avgWarmth ?? '—'}</div>
              <div className="text-[10px] text-white/30 uppercase tracking-wider">Avg Warmth</div>
            </div>
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider">
          Members ({campaign.stats?.totalMembers ?? 0})
        </h3>
        <Button onClick={() => setShowAddMembers(true)}>+ Add Members</Button>
      </div>

      {/* Filter/Sort Toolbar */}
      <div className="flex gap-3 mb-4 items-end flex-wrap">
        <div className="max-w-xs flex-1">
          <SearchBar onSearch={setSearch} placeholder="Search members..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
        >
          <option value="">All Statuses</option>
          {memberStatusOrder.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
        >
          <option value="">All Tiers</option>
          <option value="1">T1 - Inner Circle</option>
          <option value="2">T2 - Key</option>
          <option value="3">T3 - Active</option>
          <option value="4">T4 - Extended</option>
          <option value="5">T5 - Acquaintance</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
        >
          <option value="addedAt">Sort: Recently Added</option>
          <option value="name">Sort: Name</option>
          <option value="warmth">Sort: Warmth</option>
          <option value="tier">Sort: Tier</option>
          <option value="priority">Sort: Priority</option>
          <option value="lastOutreach">Sort: Last Outreach</option>
          <option value="nextAction">Sort: Next Action</option>
        </select>
      </div>

      {/* Members Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Tier</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Warmth</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Last Outreach</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Next Action</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Notes</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium text-white/30 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody>
            {members?.map((member) => (
              <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/people/${member.personId}`} className="text-neon-cyan hover:text-neon-cyan/80 text-sm font-medium transition-colors">
                    {member.person.name}
                  </Link>
                  {member.person.title && <p className="text-xs text-white/20 mt-0.5">{member.person.title}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 text-[10px] rounded border ${tierGlow[member.person.tier]}`}>
                    {tierLabels[member.person.tier]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => cycleMemberStatus(member)}>
                    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider rounded border cursor-pointer hover:opacity-80 transition-opacity ${memberStatusStyles[member.status]}`}>
                      {member.status.replace('_', ' ')}
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={member.warmth ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : null;
                      updateMember.mutate({ memberId: member.id, data: { warmth: val } });
                    }}
                    className="bg-transparent border-none text-sm text-white/40 focus:outline-none cursor-pointer"
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-white/30">
                  {member.lastOutreachAt
                    ? new Date(member.lastOutreachAt).toLocaleDateString()
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-white/40 max-w-[200px]">
                    {member.nextAction ? (
                      <span className="truncate block">{member.nextAction}</span>
                    ) : '—'}
                    {member.nextActionAt && (
                      <span className="text-[10px] text-white/20 block">
                        {new Date(member.nextActionAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-white/30 max-w-[150px] truncate">
                  {member.notes || '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeMember.mutate(member.id)}
                    className="text-red-400/40 hover:text-red-400 text-xs transition-colors"
                  >
                    remove
                  </button>
                </td>
              </tr>
            ))}
            {members?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-white/20">
                  No members yet. Click "+ Add Members" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddMembersModal
        open={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        existingMemberIds={existingMemberIds}
        onAdd={(personIds) => {
          bulkAdd.mutate(personIds, {
            onSuccess: () => setShowAddMembers(false),
          });
        }}
        isAdding={bulkAdd.isPending}
      />
    </div>
  );
}
