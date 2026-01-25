'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AddTeamMemberForm } from '@/components/admin/add-team-member-form';
import type { UserRole } from '@/lib/db/types';

type SettingsTab = 'general' | 'team' | 'billing' | 'integrations' | 'security';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position: string;
  role: UserRole;
  responsibilities?: string;
  is_active: boolean;
  last_login: string | null;
  first_admin?: boolean;
}

interface PendingInvitation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position: string;
  role: UserRole;
  responsibilities?: string;
  invited_at: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export default function TeamSettingsPage() {
  const [activeTab] = useState<SettingsTab>('team');
  const [showAddForm, setShowAddForm] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      // Fetch team members
      const membersRes = await fetch('/api/admin/employees');
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setTeamMembers(membersData.employees || []);
      }

      // Fetch pending invitations
      const invitesRes = await fetch('/api/invitations');
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvitations(invitesData.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSuccess = () => {
    setShowAddForm(false);
    fetchTeamData();
  };

  const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
    super_admin: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    admin: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
    internal_auditor: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    supervisor: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    worker: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  };

  const ROLE_LABELS: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    internal_auditor: 'Internal Auditor',
    supervisor: 'Supervisor',
    worker: 'Worker',
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/settings"
            className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2h5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a3 3 0 11-6 0 3 3 0 016 0zM13 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Team Management</h1>
              <p className="text-[var(--muted)]">Add and manage your team members</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-slate-800/50 p-1 rounded-lg overflow-x-auto">
          {[
            { id: 'general', label: 'General', href: '/admin/settings' },
            { id: 'team', label: 'Team', href: '/admin/settings/team' },
            { id: 'billing', label: 'Billing', href: '/admin/settings/billing' },
            { id: 'integrations', label: 'Integrations', href: '/admin/settings/integrations' },
            { id: 'security', label: 'Security', href: '/admin/settings/security' },
          ].map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Add Team Member Button */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Team Members</h2>
            <p className="text-sm text-[var(--muted)]">
              Manage your team and send invitations to new members
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary"
          >
            {showAddForm ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Team Member
              </>
            )}
          </button>
        </div>

        {/* Add Team Member Form */}
        {showAddForm && (
          <div className="card mb-6">
            <AddTeamMemberForm onSuccess={handleInviteSuccess} onCancel={() => setShowAddForm(false)} />
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="card mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Pending Invitations ({invitations.length})
            </h3>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold">
                        {invitation.first_name} {invitation.last_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${ROLE_COLORS[invitation.role].bg} ${ROLE_COLORS[invitation.role].text}`}>
                        {ROLE_LABELS[invitation.role]}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--muted)] space-y-1">
                      <div>{invitation.email}</div>
                      {invitation.phone && <div>{invitation.phone}</div>}
                      <div>{invitation.position}</div>
                      {invitation.responsibilities && (
                        <div className="mt-2 text-xs italic">{invitation.responsibilities}</div>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-2">
                      Invited {new Date(invitation.invited_at).toLocaleDateString()} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      invitation.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      invitation.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-slate-700/50 text-slate-400'
                    }`}>
                      {invitation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Team Members */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2h5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a3 3 0 11-6 0 3 3 0 016 0zM13 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Active Team Members ({teamMembers.filter(m => m.is_active).length})
          </h3>
          
          {loading ? (
            <div className="text-center py-8 text-[var(--muted)]">Loading team members...</div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted)]">
              No team members yet. Add your first team member above.
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers
                .filter(m => m.is_active)
                .map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-700 bg-slate-800/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold">
                          {member.first_name} {member.last_name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${ROLE_COLORS[member.role].bg} ${ROLE_COLORS[member.role].text}`}>
                          {ROLE_LABELS[member.role]}
                        </span>
                        {member.first_admin && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                            First Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[var(--muted)] space-y-1">
                        <div>{member.email}</div>
                        {member.phone && <div>{member.phone}</div>}
                        <div>{member.position}</div>
                        {member.responsibilities && (
                          <div className="mt-2 text-xs italic">{member.responsibilities}</div>
                        )}
                      </div>
                      {member.last_login && (
                        <div className="text-xs text-[var(--muted)] mt-2">
                          Last login: {new Date(member.last_login).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
