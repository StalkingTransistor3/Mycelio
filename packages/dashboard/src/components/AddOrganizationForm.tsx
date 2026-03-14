import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import Modal from './Modal.js';
import FormField, { Input, Textarea, Button } from './FormField.js';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddOrganizationForm({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    type: 'company',
    domain: '',
    industry: '',
    description: '',
    tags: '',
    notes: '',
  });

  const createOrg = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createOrganization(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      setForm({ name: '', type: 'company', domain: '', industry: '', description: '', tags: '', notes: '' });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrg.mutate({
      name: form.name,
      type: form.type,
      domain: form.domain || undefined,
      industry: form.industry || undefined,
      description: form.description || undefined,
      notes: form.notes || undefined,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()) : [],
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Organisation">
      <form onSubmit={handleSubmit}>
        <FormField label="Name *">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" />
        </FormField>
        <FormField label="Type">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/40"
          >
            <option value="company">Company</option>
            <option value="community">Community</option>
            <option value="other">Other</option>
          </select>
        </FormField>
        <FormField label="Domain">
          <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="https://example.com" />
        </FormField>
        <FormField label="Industry">
          <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Technology" />
        </FormField>
        <FormField label="Description">
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this organisation does..." />
        </FormField>
        <FormField label="Tags (comma-separated)">
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="sponsor, host, tech" />
        </FormField>
        <FormField label="Notes">
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." />
        </FormField>
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createOrg.isPending}>
            {createOrg.isPending ? 'Creating...' : 'Create Organisation'}
          </Button>
        </div>
        {createOrg.isError && (
          <p className="text-red-400 text-xs mt-2">Error: {(createOrg.error as Error).message}</p>
        )}
      </form>
    </Modal>
  );
}
