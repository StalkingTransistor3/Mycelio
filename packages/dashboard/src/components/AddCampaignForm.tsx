import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import Modal from './Modal.js';
import FormField, { Input, Textarea, Button } from './FormField.js';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddCampaignForm({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', description: '', goal: '', type: 'outreach', tags: '', startDate: '', endDate: '',
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createCampaign(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setForm({ name: '', description: '', goal: '', type: 'outreach', tags: '', startDate: '', endDate: '' });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: form.name,
      description: form.description || undefined,
      goal: form.goal || undefined,
      type: form.type,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()) : [],
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="New Campaign">
      <form onSubmit={handleSubmit}>
        <FormField label="Campaign Name *">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q2 AI Founders Outreach" />
        </FormField>
        <FormField label="Description">
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this campaign is about" />
        </FormField>
        <FormField label="Goal">
          <Textarea rows={2} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="What success looks like" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
            >
              <option value="outreach">Outreach</option>
              <option value="nurture">Nurture</option>
              <option value="event">Event</option>
              <option value="recruitment">Recruitment</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField label="Tags (comma-separated)">
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ai, founders" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Date">
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </FormField>
          <FormField label="End Date">
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
        {mutation.isError && (
          <p className="text-red-400 text-xs mt-2">Error: {(mutation.error as Error).message}</p>
        )}
      </form>
    </Modal>
  );
}
