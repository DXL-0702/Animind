'use client';

import { useTranslation } from '@/hooks/useTranslation';

const tools = [
  {
    href: '/oc-generator',
    icon: '🎨',
    nameKey: 'tool.oc-generator',
    descKey: 'tool.oc-generator.desc',
    colorClass: 'text-primary',
  },
  {
    href: '/tone-writer',
    icon: '✍️',
    nameKey: 'tool.tone-writer',
    descKey: 'tool.tone-writer.desc',
    colorClass: 'text-secondary',
  },
  {
    href: '/comic-generator',
    icon: '📖',
    nameKey: 'tool.comic-generator',
    descKey: 'tool.comic-generator.desc',
    colorClass: 'text-accent',
  },
  {
    href: '/art-prompt',
    icon: '🖼️',
    nameKey: 'tool.art-prompt',
    descKey: 'tool.art-prompt.desc',
    colorClass: 'text-info',
  },
  {
    href: '/title-optimizer',
    icon: '🏷️',
    nameKey: 'tool.title-optimizer',
    descKey: 'tool.title-optimizer.desc',
    colorClass: 'text-success',
  },
  {
    href: '/companion',
    icon: '💖',
    nameKey: 'tool.companion',
    descKey: 'tool.companion.desc',
    colorClass: 'text-error',
  },
];

export default function ToolCardGrid() {
  const { t } = useTranslation();

  return (
    <section className="w-full lg:w-1/2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <a
            key={tool.href}
            href={tool.href}
            className="bg-base-100/80 backdrop-blur-sm rounded-xl p-5 border border-base-300/50 hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 ease-out"
          >
            <div className="text-3xl mb-3">{tool.icon}</div>
            <h3 className={`text-lg font-bold mb-2 ${tool.colorClass}`}>
              {t(tool.nameKey)}
            </h3>
            <p className="text-sm opacity-60">{t(tool.descKey)}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
