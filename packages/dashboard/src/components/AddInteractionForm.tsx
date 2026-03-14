import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import Modal from './Modal.js';
import FormField, { Input, Select, Textarea, Button } from './FormField.js';

interface Props {
  open: boolean;
  onClose: () => void;
  personId?: string;
  personName?: string;
}

export default function AddInteractionForm({ open, onClose, personId, personName }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    type: 'meeting', summary: '', details: '', occurredAt: new Date().toISOString().slice(0, 10),
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createInteraction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interactions'] });
      qc.invalidateQueries({ queryKey: ['people'] });
      qc.invalidateQueries({ queryKey: ['follow-ups'] });
      setForm({ type: 'meeting', summary: '', details: '', occurredAt: new Date().toISOString().slice(0, 10) });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      personId,
      type: form.type,
      summary: form.summary,
      details: form.details || undefined,
      occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Log Interaction${personName ? ` — ${personName}` : ''}`}>
      <form onSubmit={handleSubmit}>
        <FormField label="Type">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="meeting" className="bg-[#0a0a0f]">Meeting</option>
            <option value="email" className="bg-[#0a0a0f]">Email</option>
            <option value="call" className="bg-[#0a0a0f]">Call</option>
            <option value="social" className="bg-[#0a0a0f]">Social</option>
            <option value="event" className="bg-[#0a0a0f]">Event</option>
            <option value="intro" className="bg-[#0a0a0f]">Intro</option>
            <option value="follow_up" className="bg-[#0a0a0f]">Follow-up</option>
            <option value="other" className="bg-[#0a0a0f]">Other</option>
          </Select>
        </FormField>
        <FormField label="Summary *">
          <Input required value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Discussed Q2 roadmap" />
        </FormField>
        <FormField label="Details">
          <Textarea rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Additional context..." />
        </FormField>
        <FormField label="Date">
          <Input type="date" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} />
        </FormField>
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Logging...' : 'Log Interaction'}
          </Button>
        </div>
        {mutation.isError && (
          <p className="text-red-400 text-xs mt-2">Error: {(mutation.error as Error).message}</p>
        )}
      </form>
    </Modal>
  );
}
