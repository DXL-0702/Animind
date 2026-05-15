interface ToolInputCardProps {
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
  loadingLabel: string;
  btnClass: string;
  disabled?: boolean;
  extraActions?: React.ReactNode;
}

export default function ToolInputCard({
  title,
  placeholder,
  value,
  onChange,
  onSubmit,
  loading,
  submitLabel,
  loadingLabel,
  btnClass,
  disabled,
  extraActions,
}: ToolInputCardProps) {
  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        <textarea
          className="textarea textarea-bordered h-32 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:outline-none transition-all"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <div className="flex items-center gap-2 flex-wrap">
          {extraActions}
          <button
            className={`btn ${btnClass} ${loading ? 'loading' : ''} active:scale-[0.97] transition-transform focus-visible:ring-2 focus-visible:ring-offset-2`}
            onClick={onSubmit}
            disabled={loading || !value.trim() || disabled}
          >
            {loading ? loadingLabel : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
