'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, Shield, FileText, Users, GraduationCap, FolderOpen, 
  Wrench, Settings, BarChart3, ClipboardCheck, Building2,
  Camera, BookOpen, AlertTriangle, Calendar, Target,
  Upload, Bell, FileCheck, Layers, MapPin, Briefcase,
  Package, CheckSquare, TrendingUp, HelpCircle, FolderPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

const dashboardCategories = [
  {
    category: 'Administrative',
    icon: FolderPlus,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    features: [
      { title: 'Add Employees', href: '/admin/employees', icon: Users, description: 'Enter your workforce' },
      { title: 'Add Departments', href: '/admin/departments', icon: Building2, description: 'Set up your teams' },
      { title: 'Upload Documents', href: '/admin/documents/upload', icon: Upload, description: 'Add company documents' },
      { title: 'Equipment & Assets', href: '/admin/libraries', icon: Package, description: 'Enter equipment lists' },
      { title: 'Upload Certifications', href: '/admin/certifications/bulk-upload', icon: GraduationCap, description: 'Add training records' },
      { title: 'Company Settings', href: '/admin/settings', icon: Settings, description: 'Company profile & info' },
    ]
  },
  {
    category: 'COR Compliance',
    icon: Shield,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    features: [
      { title: 'COR Audit Dashboard', href: '/audit', icon: Shield, description: 'Track all 14 COR elements' },
      { title: 'Compliance Scorecard', href: '/audit', icon: TrendingUp, description: 'View your audit readiness' },
      { title: 'Action Plan', href: '/admin/action-plan', icon: Target, description: 'Tasks to certification' },
      { title: 'COR Roadmap', href: '/phases', icon: MapPin, description: 'Your certification journey' },
    ]
  },
  {
    category: 'Forms & Inspections',
    icon: FileText,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    features: [
      { title: 'Form Templates', href: '/admin/form-templates', icon: FileText, description: 'Create & manage forms' },
      { title: 'Forms Manager', href: '/admin/forms', icon: Layers, description: 'Build custom forms' },
      { title: 'Submissions', href: '/forms', icon: CheckSquare, description: 'View completed forms' },
      { title: 'PDF Import', href: '/admin/forms/import', icon: Upload, description: 'Import existing PDFs' },
    ]
  },
  {
    category: 'Documents',
    icon: FolderOpen,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    features: [
      { title: 'Document Registry', href: '/admin/documents', icon: FolderOpen, description: 'All company documents' },
      { title: 'Document Reviews', href: '/admin/documents/reviews', icon: FileCheck, description: 'Pending approvals' },
      { title: 'Audit Documents', href: '/admin/audit/documents', icon: Shield, description: 'COR evidence files' },
    ]
  },
  {
    category: 'Team & Training',
    icon: Users,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/20',
    features: [
      { title: 'Employee Directory', href: '/admin/employees', icon: Users, description: 'View all employees' },
      { title: 'Certifications', href: '/admin/certifications', icon: GraduationCap, description: 'Track training & tickets' },
      { title: 'My Certificates', href: '/my-certificates', icon: Camera, description: 'Upload your tickets' },
    ]
  },
  {
    category: 'Equipment & Maintenance',
    icon: Wrench,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    features: [
      { title: 'Maintenance Dashboard', href: '/admin/maintenance', icon: Wrench, description: 'Equipment overview' },
      { title: 'Work Orders', href: '/admin/maintenance', icon: ClipboardCheck, description: 'Track repairs' },
      { title: 'Inspection Schedules', href: '/admin/maintenance', icon: Calendar, description: 'Upcoming inspections' },
    ]
  },
  {
    category: 'Libraries',
    icon: BookOpen,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    features: [
      { title: 'Hazard Library', href: '/admin/libraries', icon: AlertTriangle, description: 'Hazards & controls' },
      { title: 'Task Library', href: '/admin/libraries', icon: Briefcase, description: 'Standard tasks' },
      { title: 'SDS Library', href: '/admin/libraries', icon: FileText, description: 'Safety data sheets' },
      { title: 'Legislation', href: '/admin/libraries', icon: BookOpen, description: 'Regulatory references' },
    ]
  },
  {
    category: 'Reports & Export',
    icon: BarChart3,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    features: [
      { title: 'AuditSoft Export', href: '/admin/auditsoft', icon: Package, description: 'Export to AuditSoft' },
      { title: 'Reports', href: '/admin/certifications/reports', icon: BarChart3, description: 'Generate reports' },
      { title: 'Notifications', href: '/admin/certifications/notifications', icon: Bell, description: 'Alert settings' },
      { title: 'Help Center', href: '/help', icon: HelpCircle, description: 'Guides & tutorials' },
    ]
  },
];

export function DashboardAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {dashboardCategories.map((cat, index) => {
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
