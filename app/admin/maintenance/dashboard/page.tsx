'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  overdueCount: number;
  dueSoon30Days: number;
  ytdCost: number;
  recentMaintenanceCount: number;
}

interface OverdueItem {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  schedule_name: string;
  maintenance_type: string;
  next_due_date: string;
  days_overdue: number;
}

interface UpcomingItem {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  schedule_name: string;
  maintenance_type: string;
  next_due_date: string;
  days_until_due: number;
}

interface RecentRecord {
  id: string;
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  maintenance_type: string;
  work_description: string;
  actual_date: string;
  cost_total: number;
  passed_inspection: boolean | null;
}

interface MonthlyCost {
  month: string;
  cost: number;
  preventive: number;
  corrective: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MaintenanceDashboardPage() {
  const router = useRouter();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalEquipment: 0,
    activeEquipment: 0,
    overdueCount: 0,
    dueSoon30Days: 0,
    ytdCost: 0,
    recentMaintenanceCount: 0
  });
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([]);
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCost[]>([]);
  
  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch('/api/maintenance/dashboard');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          totalEquipment: data.total_equipment || 0,
          activeEquipment: data.active_equipment || 0,
          overdueCount: data.overdue_count || 0,
          dueSoon30Days: data.due_soon_30_days || 0,
          ytdCost: data.ytd_cost || 0,
          recentMaintenanceCount: data.recent_maintenance_count || 0
        });
        setOverdueItems(data.overdue_items || []);
        setUpcomingItems(data.upcoming_items || []);
        setRecentRecords(data.recent_records || []);
        setMonthlyCosts(data.monthly_costs || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  // Calculate max cost for chart scaling
  const maxCost = useMemo(() => {
    if (monthlyCosts.length === 0) return 1000;
    return Math.max(...monthlyCosts.map(m => m.cost)) || 1000;
  }, [monthlyCosts]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-[var(--muted)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🔧 Maintenance Dashboard
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            ↻ Refresh
          </Button>
          <Button onClick={() => router.push('/admin/maintenance')}>
            View All Equipment
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          value={stats.activeEquipment}
          label="Equipment Active"
          icon="🏗️"
          subtext={`${stats.totalEquipment} total`}
        />
        <StatCard
          value={stats.overdueCount}
          label="Overdue Maint"
          icon="⚠️"
          variant={stats.overdueCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          value={stats.dueSoon30Days}
          label="Due 30 Days"
          icon="📅"
          variant={stats.dueSoon30Days > 5 ? 'warning' : 'default'}
        />
        <StatCard
          value={`$${stats.ytdCost.toLocaleString()}`}
          label="YTD Cost"
          icon="💰"
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Overdue Maintenance */}
        <Card className={overdueItems.length > 0 ? 'border-red-500/50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              Overdue Maintenance ({overdueItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueItems.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)]">
                <div className="text-3xl mb-2">✅</div>
                <p>No overdue maintenance!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {overdueItems.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">
                          {item.equipment_code}: {item.equipment_name}
                        </div>
                        <div className="text-sm text-[var(--muted)]">
                          {item.schedule_name}
                        </div>
                        <div className="text-sm text-red-500 font-medium">
                          Due: {new Date(item.next_due_date).toLocaleDateString()} 
                          ({item.days_overdue} days overdue)
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => router.push(`/admin/equipment/${item.equipment_id}/maintenance`)}
                      >
                        Schedule Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Upcoming Maintenance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              📅 Upcoming Maintenance (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingItems.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)]">
                <div className="text-3xl mb-2">📅</div>
                <p>No upcoming maintenance scheduled</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {upcomingItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-2 hover:bg-[var(--muted)]/10 rounded-lg cursor-pointer"
                    onClick={() => router.push(`/admin/equipment/${item.equipment_id}/maintenance`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-[var(--muted)] w-16">
                        {new Date(item.next_due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {item.equipment_code}: {item.equipment_name}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          {item.schedule_name}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.days_until_due <= 7 
                        ? 'bg-yellow-500/10 text-yellow-500' 
                        : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {item.days_until_due} days
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Maintenance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              🔧 Recent Maintenance (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)]">
                <div className="text-3xl mb-2">📋</div>
                <p>No recent maintenance records</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {recentRecords.map((record) => (
                  <div 
                    key={record.id}
                    className="flex items-center justify-between p-2 hover:bg-[var(--muted)]/10 rounded-lg cursor-pointer"
                    onClick={() => router.push(`/admin/maintenance/records/${record.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-[var(--muted)] w-16">
                        {new Date(record.actual_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {record.equipment_code}: {record.work_description?.substring(0, 30)}
                          {(record.work_description?.length || 0) > 30 ? '...' : ''}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                          <span className={`px-1.5 py-0.5 rounded ${
                            record.maintenance_type === 'preventive' 
                              ? 'bg-blue-500/10 text-blue-500'
                              : record.maintenance_type === 'corrective'
                                ? 'bg-orange-500/10 text-orange-500'
                                : 'bg-green-500/10 text-green-500'
                          }`}>
                            {record.maintenance_type}
                          </span>
                          {record.passed_inspection !== null && (
                            <span className={record.passed_inspection ? 'text-green-500' : 'text-red-500'}>
                              {record.passed_inspection ? '✓ Pass' : '✗ Fail'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {record.cost_total > 0 && (
                      <span className="text-sm font-medium">
                        ${record.cost_total.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Cost Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              💰 Maintenance Costs (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyCosts.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)]">
                <div className="text-3xl mb-2">📊</div>
                <p>No cost data available</p>
              </div>
            ) : (
              <div className="h-[250px]">
                {/* Simple CSS-based bar chart */}
                <div className="flex items-end justify-between h-[200px] gap-1 px-2">
                  {monthlyCosts.map((month, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full flex flex-col-reverse"
                        style={{ height: '180px' }}
                      >
                        {/* Corrective (top) */}
                        <div 
                          className="w-full bg-orange-500/80 rounded-t"
                          style={{ 
                            height: `${(month.corrective / maxCost) * 180}px`,
                            minHeight: month.corrective > 0 ? '2px' : '0'
                          }}
                          title={`Corrective: $${month.corrective}`}
                        />
                        {/* Preventive (bottom) */}
                        <div 
                          className="w-full bg-blue-500/80"
                          style={{ 
                            height: `${(month.preventive / maxCost) * 180}px`,
                            minHeight: month.preventive > 0 ? '2px' : '0'
                          }}
                          title={`Preventive: $${month.preventive}`}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--muted)]">
                        {month.month}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div className="flex justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 bg-blue-500/80 rounded" />
                    <span>Preventive</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 bg-orange-500/80 rounded" />
                    <span>Corrective</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Equipment List Quick Access */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Equipment Overview</CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/maintenance')}>
              View All →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 px-3 font-medium">Equipment</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Last Maintenance</th>
                  <th className="text-left py-2 px-3 font-medium">Next Due</th>
                  <th className="text-right py-2 px-3 font-medium">YTD Cost</th>
                </tr>
              </thead>
              <tbody>
                {/* This would be populated from API */}
                <tr className="border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/5">
                  <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/admin/maintenance')}
                    >
                      View Equipment List
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Actions */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2">
        <Button 
          className="shadow-lg"
          onClick={() => router.push('/admin/maintenance/work-orders/new')}
        >
          + New Work Order
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function StatCard({
  value,
  label,
  icon,
  subtext,
  variant = 'default'
}: {
  value: string | number;
  label: string;
  icon: string;
  subtext?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: 'bg-[var(--card)]',
    success: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    danger: 'bg-red-500/10 border-red-500/30'
  };
  
  const valueClasses = {
    default: '',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500'
  };
  
  // Safe: Variant is constrained to specific string literal types, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const variantClass = variantClasses[variant];
  // Safe: Variant is constrained to specific string literal types, not arbitrary user input
  // eslint-disable-next-line security/detect-object-injection
  const valueClass = valueClasses[variant];
  
  return (
    <Card className={`${variantClass} border`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <div className={`text-2xl font-bold ${valueClass}`}>
              {value}
            </div>
            <div className="text-sm text-[var(--muted)]">{label}</div>
            {subtext && (
              <div className="text-xs text-[var(--muted)] mt-1">{subtext}</div>
            )}
          </div>
          <span className="text-2xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}
