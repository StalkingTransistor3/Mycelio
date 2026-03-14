import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import Modal from './Modal.js';
import FormField, { Input, Textarea, Button } from './FormField.js';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddEventForm({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', date: '', location: '', description: '', tags: '',
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      setForm({ name: '', date: '', location: '', description: '', tags: '' });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: form.name,
      date: new Date(form.date).toISOString(),
      location: form.location || undefined,
      description: form.description || undefined,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()) : [],
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Event">
      <form onSubmit={handleSubmit}>
        <FormField label="Event Name *">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Startup Mixer" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date *">
            <Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FormField>
          <FormField label="Location">
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Sydney CBD" />
          </FormField>
        </div>
        <FormField label="Description">
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's the event about?" />
        </FormField>
        <FormField label="Tags (comma-separated)">
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="networking, tech, startup" />
        </FormField>
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
        {mutation.isError && (
          <p className="text-red-400 text-xs mt-2">Error: {(mutation.error as Error).message}</p>
        )}
      </form>
    </Modal>
  );
}
