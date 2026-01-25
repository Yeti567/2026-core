'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { TRAINING_CATEGORIES, type TrainingCategory } from '@/lib/certifications/types';

// =============================================================================
// TYPES
// =============================================================================

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  position: string | null;
}

interface TrainingType {
  id: string;
  name: string;
  category: string;
  requires_hours: boolean;
  default_hours: number | null;
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NewTrainingRecordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  
  const [form, setForm] = useState({
    training_type_id: '',
    title: '',
    description: '',
    category: 'toolbox_talk' as TrainingCategory,
    completed_date: new Date().toISOString().split('T')[0],
    hours_completed: '',
    instructor_name: '',
    topics: '',
    notes: '',
  });

  // Fetch workers and training types
  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .single();

      if (profile) {
        const { data: workersData } = await supabase
          .from('workers')
          .select('id, first_name, last_name, email, position')
          .eq('company_id', profile.company_id)
          .order('last_name');
        
        setWorkers(workersData || []);
      }

      const typesRes = await fetch('/api/training/types');
      const typesData = await typesRes.json();
      setTrainingTypes(typesData.types || []);
    };

    fetchData();
  }, []);

  const filteredWorkers = workers.filter(w => {
    if (!workerSearch) return true;
    const search = workerSearch.toLowerCase();
    return (
      w.first_name?.toLowerCase().includes(search) ||
      w.last_name?.toLowerCase().includes(search) ||
      w.email?.toLowerCase().includes(search)
    );
  });

  const handleTypeChange = (typeId: string) => {
    const type = trainingTypes.find(t => t.id === typeId);
    setForm(prev => ({
      ...prev,
      training_type_id: typeId,
      title: type?.name || prev.title,
      category: (type?.category as TrainingCategory) || prev.category,
      hours_completed: type?.default_hours?.toString() || prev.hours_completed,
    }));
  };

  const toggleWorker = (workerId: string) => {
    const newSelected = new Set(selectedWorkers);
    if (newSelected.has(workerId)) {
      newSelected.delete(workerId);
    } else {
      newSelected.add(workerId);
    }
    setSelectedWorkers(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedWorkers);
    filteredWorkers.forEach(w => newSelected.add(w.id));
    setSelectedWorkers(newSelected);
  };

  const clearSelection = () => {
    setSelectedWorkers(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedWorkers.size === 0) {
      alert('Please select at least one worker');
      return;
    }
    if (!form.title) {
      alert('Training title is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          worker_ids: Array.from(selectedWorkers),
          hours_completed: form.hours_completed ? parseFloat(form.hours_completed) : null,
          topics: form.topics ? form.topics.split(',').map(t => t.trim()).filter(Boolean) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to create training records');
        return;
      }

      router.push('/admin/certifications');
    } catch (err) {
      console.error('Create error:', err);
      alert('Failed to create training records');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            href="/admin/certifications"
            className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Certifications
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">📝</span>
            Record Training
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Log toolbox talks, on-the-job training, and other training sessions for multiple workers at once
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Training Details */}
          <div className="card space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
              Training Details
            </h2>

            {/* Training Type */}
            <div>
              <label className="label">Training Type</label>
              <select
                className="input"
                value={form.training_type_id}
                onChange={e => handleTypeChange(e.target.value)}
              >
                <option value="">Select type or enter custom...</option>
                <optgroup label="Toolbox Talks">
                  {trainingTypes.filter(t => t.category === 'toolbox_talk').map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </optgroup>
                <optgroup label="On-the-Job Training">
                  {trainingTypes.filter(t => t.category === 'ojt').map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Orientation">
                  {trainingTypes.filter(t => t.category === 'orientation').map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  {trainingTypes.filter(t => !['toolbox_talk', 'ojt', 'orientation'].includes(t.category)).map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                className="input"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Weekly Safety Toolbox Talk - Ladder Safety"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="label">Category *</label>
              <select
                className="input"
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value as TrainingCategory }))}
                required
              >
                {TRAINING_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Date and Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  className="input"
                  value={form.completed_date}
                  onChange={e => setForm(prev => ({ ...prev, completed_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Duration (hours)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  className="input"
                  value={form.hours_completed}
                  onChange={e => setForm(prev => ({ ...prev, hours_completed: e.target.value }))}
                  placeholder="e.g., 0.5"
                />
              </div>
            </div>

            {/* Instructor */}
            <div>
              <label className="label">Instructor / Supervisor</label>
              <input
                type="text"
                className="input"
                value={form.instructor_name}
                onChange={e => setForm(prev => ({ ...prev, instructor_name: e.target.value }))}
                placeholder="Name of person conducting the training"
              />
            </div>

            {/* Topics */}
            <div>
              <label className="label">Topics Covered</label>
              <input
                type="text"
                className="input"
                value={form.topics}
                onChange={e => setForm(prev => ({ ...prev, topics: e.target.value }))}
                placeholder="Separate with commas: Ladder setup, 3-point contact, inspections"
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">Description / Notes</label>
              <textarea
                className="input"
                rows={4}
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details, discussions, observations..."
              />
            </div>
          </div>

          {/* Right Column - Worker Selection */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <h2 className="text-lg font-semibold text-white">
                Select Attendees *
              </h2>
              <span className="text-sm text-indigo-400">
                {selectedWorkers.size} selected
              </span>
            </div>

            {/* Search and Bulk Actions */}
            <div className="space-y-2">
              <input
                type="text"
                className="input"
                placeholder="Search workers..."
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Select all visible
                </button>
                {selectedWorkers.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs text-slate-400 hover:text-slate-300"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>

            {/* Worker List */}
            <div className="max-h-[400px] overflow-y-auto border border-slate-700 rounded-lg">
              {filteredWorkers.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 text-center">No workers found</p>
              ) : (
                filteredWorkers.map(worker => (
                  <label
                    key={worker.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-800/50 transition-colors border-b border-slate-700/50 last:border-0 ${
                      selectedWorkers.has(worker.id) ? 'bg-indigo-500/10' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedWorkers.has(worker.id)}
                      onChange={() => toggleWorker(worker.id)}
                      className="rounded border-slate-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {worker.first_name} {worker.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {worker.position || worker.email || '-'}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {/* Selected Workers Preview */}
            {selectedWorkers.size > 0 && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                <p className="text-sm text-indigo-300 mb-2">
                  Training will be recorded for {selectedWorkers.size} worker(s):
                </p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedWorkers).slice(0, 10).map(id => {
                    const worker = workers.find(w => w.id === id);
                    return worker ? (
                      <span key={id} className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {worker.first_name} {worker.last_name?.[0]}.
                      </span>
                    ) : null;
                  })}
                  {selectedWorkers.size > 10 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      +{selectedWorkers.size - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-700">
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || selectedWorkers.size === 0 || !form.title}
              >
                {loading
                  ? 'Recording...'
                  : `Record Training for ${selectedWorkers.size} Worker${selectedWorkers.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
