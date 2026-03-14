import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import Modal from './Modal.js';
import FormField, { Input, Select, Textarea, Button } from './FormField.js';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddPersonForm({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', title: '', tier: '3', tags: '', notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createPerson(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] });
      setForm({ name: '', email: '', phone: '', title: '', tier: '3', tags: '', notes: '' });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      title: form.title || undefined,
      tier: parseInt(form.tier),
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()) : [],
      notes: form.notes || undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Person">
      <form onSubmit={handleSubmit}>
        <FormField label="Name *">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
          </FormField>
          <FormField label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+61..." />
          </FormField>
        </div>
        <FormField label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="CTO at Acme" />
        </FormField>
        <FormField label="Tier">
          <Select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
            <option value="1" className="bg-[#0a0a0f]">1 — Inner Circle</option>
            <option value="2" className="bg-[#0a0a0f]">2 — Key Relationships</option>
            <option value="3" className="bg-[#0a0a0f]">3 — Active Network</option>
            <option value="4" className="bg-[#0a0a0f]">4 — Extended Network</option>
            <option value="5" className="bg-[#0a0a0f]">5 — Acquaintances</option>
          </Select>
        </FormField>
        <FormField label="Tags (comma-separated)">
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="investor, tech, sydney" />
        </FormField>
        <FormField label="Notes">
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="How you know them..." />
        </FormField>
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Adding...' : 'Add Person'}
          </Button>
        </div>
        {mutation.isError && (
          <p className="text-red-400 text-xs mt-2">Error: {(mutation.error as Error).message}</p>
        )}
      </form>
    </Modal>
  );
}
