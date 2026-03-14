import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import Modal from './Modal.js';
import FormField, { Input, Textarea, Button } from './FormField.js';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddCommunityForm({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', description: '', tags: '',
  });

  const createCommunity = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch(`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : ''}/api/communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities'] });
      setForm({ name: '', description: '', tags: '' });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCommunity.mutate({
      name: form.name,
      description: form.description || undefined,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()) : [],
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Community">
      <form onSubmit={handleSubmit}>
        <FormField label="Community Name *">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sydney Tech Founders" />
        </FormField>
        <FormField label="Description">
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this community is about..." />
        </FormField>
        <FormField label="Tags (comma-separated)">
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="tech, founders, sydney" />
        </FormField>
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createCommunity.isPending}>
            {createCommunity.isPending ? 'Creating...' : 'Create Community'}
          </Button>
        </div>
        {createCommunity.isError && (
          <p className="text-red-400 text-xs mt-2">Error: {(createCommunity.error as Error).message}</p>
        )}
      </form>
    </Modal>
  );
}
