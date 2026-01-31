'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Feature {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

interface Category {
  category: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  features: Feature[];
}

interface DashboardAccordionProps {
  categories: Category[];
}

export function DashboardAccordion({ categories }: DashboardAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {categories.map((cat, index) => {
        const isOpen = openIndex === index;
        const Icon = cat.icon;
        
        return (
          <div
            key={cat.category}
            className={cn(
              "rounded-xl border transition-all duration-300",
              isOpen 
                ? "border-slate-600 bg-slate-800/70" 
                : "border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50"
            )}
          >
            <button
              onClick={() => toggleAccordion(index)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  cat.bgColor
                )}>
                  <Icon className={cn("w-5 h-5", cat.color)} />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{cat.category}</h2>
                  <p className="text-xs text-slate-400">{cat.features.length} options</p>
                </div>
              </div>
              <ChevronDown 
                className={cn(
                  "w-5 h-5 text-slate-400 transition-transform duration-300",
                  isOpen && "rotate-180"
                )} 
              />
            </button>
            
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="px-4 pb-4 space-y-2">
                {cat.features.map((feature) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <Link
                      key={feature.href + feature.title}
                      href={feature.href}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                    >
                      <FeatureIcon className={cn("w-4 h-4 flex-shrink-0", cat.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-white">{feature.title}</div>
                        <div className="text-xs text-slate-400 truncate">{feature.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
