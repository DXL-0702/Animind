import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

interface ToolPageShellProps {
  title: string;
  subtitle: string;
  colorClass: string;
  emoji: string;
  children: React.ReactNode;
  maxWidthClass?: string;
  steps?: { key: string; label: string }[];
  activeStep?: number;
}

export default function ToolPageShell({
  title,
  subtitle,
  colorClass,
  emoji,
  children,
  maxWidthClass = 'max-w-4xl',
  steps,
  activeStep = -1,
}: ToolPageShellProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen theme-bg p-4 sm:p-6 lg:p-8">
      <div className={`${maxWidthClass} mx-auto`}>
        <div className="mb-6 lg:mb-8">
          <Link
            href="/"
            className="btn btn-ghost btn-sm active:scale-[0.97] transition-transform"
          >
            {t('nav.back')}
          </Link>
          <h1 className={`text-3xl sm:text-4xl font-bold mt-3 lg:mt-4 ${colorClass}`}>
            {emoji} {title}
          </h1>
          <p className="opacity-60 mt-2">{subtitle}</p>
        </div>

        {steps && steps.length > 0 && activeStep >= 0 && (
          <ul className="steps steps-horizontal w-full mb-6 lg:mb-8">
            {steps.map((step, i) => (
              <li key={step.key} className={`step ${i <= activeStep ? 'step-info' : ''}`}>
                {step.label}
              </li>
            ))}
          </ul>
        )}

        {children}
      </div>
    </div>
  );
}
