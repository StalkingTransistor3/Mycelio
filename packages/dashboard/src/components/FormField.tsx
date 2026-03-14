interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export default function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/90 placeholder-white/20 outline-none focus:border-neon-cyan/50 focus:shadow-neon transition-all ${props.className || ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/90 outline-none focus:border-neon-cyan/50 focus:shadow-neon transition-all appearance-none ${props.className || ''}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/90 placeholder-white/20 outline-none focus:border-neon-cyan/50 focus:shadow-neon transition-all resize-none ${props.className || ''}`}
    />
  );
}

export function Button({ variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const styles = variant === 'primary'
    ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30 hover:bg-neon-cyan/30 shadow-neon'
    : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70';

  return (
    <button
      {...props}
      className={`px-4 py-2 text-sm rounded-lg border transition-all ${styles} ${props.className || ''}`}
    />
  );
}
