'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CompanyStep from './steps/CompanyStep';
import EmployeeStep from './steps/EmployeeStep';
import EquipmentStep from './steps/EquipmentStep';
import DocumentStep from './steps/DocumentStep';
import FormStep from './steps/FormStep';
import { createClient } from '@supabase/supabase-js';

const STEPS = [
    { id: 1, title: 'Company', description: 'Business details' },
    { id: 2, title: 'Employees', description: 'Team members' },
    { id: 3, title: 'Equipment', description: 'Inventory & maintenance' },
    { id: 4, title: 'Documents', description: 'Manuals & policies' },
    { id: 5, title: 'Forms', description: 'Audit templates' },
];

export default function OnboardingWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        async function loadProgress() {
            // Since authentication is handled by the server component,
            // we can proceed directly to load progress
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('company_id')
                .eq('user_id', user.id)
                .single();

            if (!profile?.company_id) {
                setLoading(false);
                return;
            }

            setCompanyId(profile.company_id);

            const { data: progress } = await supabase
                .from('onboarding_progress')
                .select('*')
                .eq('company_id', profile.company_id)
                .single();

            if (progress) {
                // If everything is completed, redirect to dashboard
                if (progress.completed_steps.length === STEPS.length) {
                    router.push('/dashboard');
                    return;
                }
                setCurrentStep(progress.current_step);
                setCompletedSteps(progress.completed_steps || []);
                setSkippedSteps(progress.skipped_steps || []);
            } else {
                await supabase.from('onboarding_progress').insert({
                    company_id: profile.company_id,
                    current_step: 1,
                    completed_steps: [],
                    skipped_steps: [],
                });
            }
            setLoading(false);
        }

        loadProgress();
    }, [router, supabase]);

    const saveProgress = async (step: number, completed: boolean = true, skipped: boolean = false) => {
        if (!companyId) return;
        setSaving(true);

        const nextStep = Math.min(step + 1, STEPS.length);
        const newCompleted = completed && !completedSteps.includes(step)
            ? [...completedSteps, step]
            : completedSteps;
        const newSkipped = skipped && !skippedSteps.includes(step)
            ? [...skippedSteps, step]
            : skippedSteps.filter(s => s !== step);

        const { error } = await supabase
            .from('onboarding_progress')
            .update({
                current_step: nextStep,
                completed_steps: newCompleted,
                skipped_steps: newSkipped,
                last_updated: new Date().toISOString(),
            })
            .eq('company_id', companyId);

        if (!error) {
            if (step === STEPS.length && completed) {
                router.push('/dashboard');
            } else {
                setCurrentStep(nextStep);
                setCompletedSteps(newCompleted);
                setSkippedSteps(newSkipped);
            }
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!companyId) {
        return (
            <div className="card text-center py-12">
                <h2 className="text-xl font-bold mb-4">No Company Found</h2>
                <p className="text-slate-400 mb-6">You need to be associated with a company to complete onboarding.</p>
                <button onClick={() => router.push('/signup')} className="btn btn-primary">Register Company</button>
            </div>
        );
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <CompanyStep companyId={companyId} onComplete={() => saveProgress(1)} />;
            case 2:
                return <EmployeeStep companyId={companyId} onComplete={() => saveProgress(2)} />;
            case 3:
                return <EquipmentStep companyId={companyId} onComplete={() => saveProgress(3)} />;
            case 4:
                return <DocumentStep companyId={companyId} onComplete={() => saveProgress(4)} />;
            case 5:
                return <FormStep companyId={companyId} onComplete={() => saveProgress(5)} />;
            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 font-sans text-slate-100">
            {/* Progress Header */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Onboarding Setup
                    </h1>
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                        Step {currentStep} of {STEPS.length}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="relative pt-4">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(79,70,229,0.5)]"
                            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                        />
                    </div>

                    <div className="flex justify-between mt-6">
                        {STEPS.map((step) => (
                            <div
                                key={step.id}
                                className={`flex flex-col items-center cursor-pointer group transition-all duration-300 ${step.id > currentStep ? 'opacity-40 grayscale' : 'opacity-100'
                                    }`}
                                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transform transition-all duration-300 group-hover:scale-110 ${completedSteps.includes(step.id)
                                    ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                    : step.id === currentStep
                                        ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] rotate-3'
                                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                                    }`}>
                                    {completedSteps.includes(step.id) ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : step.id}
                                </div>
                                <span className={`text-[10px] uppercase tracking-widest font-black mt-3 transition-colors duration-300 ${step.id === currentStep ? 'text-indigo-400' : 'text-slate-500'
                                    }`}>
                                    {step.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Step Content Card */}
            <div className="card min-h-[500px] flex flex-col bg-slate-900/40 border-slate-800/50 shadow-2xl backdrop-blur-md relative overflow-hidden group/card">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

                <div className="mb-10 p-2">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="h-8 w-1 bg-indigo-500 rounded-full" />
                        <h2 className="text-2xl font-bold tracking-tight text-white">{STEPS[currentStep - 1].title}</h2>
                    </div>
                    <p className="text-slate-400 text-sm pl-4">{STEPS[currentStep - 1].description}</p>
                </div>

                <div className="flex-1 px-2">
                    {renderStep()}
                </div>

                <div className="mt-12 pt-8 border-t border-slate-800/50 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                        className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-white transition-colors disabled:opacity-0"
                        disabled={currentStep === 1 || saving}
                    >
                        <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>

                    <div className="flex items-center gap-6">
                        {currentStep < STEPS.length && (
                            <button
                                onClick={() => saveProgress(currentStep, false, true)}
                                className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors"
                                disabled={saving}
                            >
                                Skip for now
                            </button>
                        )}
                        <button
                            onClick={() => {
                                const form = document.querySelector('form');
                                if (form) {
                                    form.requestSubmit();
                                } else {
                                    saveProgress(currentStep);
                                }
                            }}
                            className="btn btn-primary min-w-[180px] h-12 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
                            disabled={saving}
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : currentStep === STEPS.length ? (
                                'Finish Setup'
                            ) : (
                                <span className="flex items-center gap-2 font-bold">
                                    Next Step
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Help Tooltip */}
            <div className="mt-12 p-5 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-4 backdrop-blur-sm">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-1">Help Center</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        This information is used to configure your <span className="text-slate-200">Safety Management System</span>. You can edit these details later in your company settings if your business scales or changes.
                    </p>
                </div>
            </div>
        </div>
    );
}
