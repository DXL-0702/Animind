import type { ImageProvider } from '@/hooks/useImageGeneration';

interface ImageProviderSelectProps {
  value: ImageProvider;
  onChange: (value: ImageProvider) => void;
  disabled?: boolean;
}

export default function ImageProviderSelect({ value, onChange, disabled }: ImageProviderSelectProps) {
  return (
    <select
      className="select select-bordered select-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as ImageProvider)}
      disabled={disabled}
    >
      <option value="jimeng">即梦AI (Anime)</option>
      <option value="doubao">豆包 Seedream 4.5</option>
    </select>
  );
}
