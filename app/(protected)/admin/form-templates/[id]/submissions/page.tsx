'use client';

/**
 * Form Submissions Page
 * 
 * Admin view for all submissions of a specific form template.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Search,
  Download,
  Eye,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  FileText,
  Calendar,
  User,
  MapPin,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { FormTemplate, FormSubmission } from '@/components/form-builder/types';

interface SubmissionWithUser extends FormSubmission {
  submitted_by_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  jobsite_name?: string;
}

export default function FormSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const templateId = params.id as string;
  
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    thisMonth: 0,
  });
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (templateError) throw templateError;
      setTemplate(templateData);
      
      // Load submissions with user info
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('form_submissions')
        .select(`
          *,
          user_profiles!form_submissions_submitted_by_fkey (
            first_name,
            last_name,
            email
          ),
          jobsites (
            name
          )
        `)
        .eq('form_template_id', templateId)
        .order('created_at', { ascending: false });
      
      if (submissionsError) throw submissionsError;
      
      const formatted = (submissionsData || []).map(sub => ({
        ...sub,
        submitted_by_user: sub.user_profiles ? {
          first_name: sub.user_profiles.first_name,
          last_name: sub.user_profiles.last_name,
          email: sub.user_profiles.email,
        } : undefined,
        jobsite_name: sub.jobsites?.name,
      }));
      
      setSubmissions(formatted);
      
      // Calculate stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      setStats({
        total: formatted.length,
        submitted: formatted.filter(s => s.status === 'submitted').length,
        approved: formatted.filter(s => s.status === 'approved').length,
        rejected: formatted.filter(s => s.status === 'rejected').length,
        thisMonth: formatted.filter(s => new Date(s.created_at) >= monthStart).length,
      });
      
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [templateId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Filter submissions
  const filteredSubmissions = submissions.filter(sub => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const userName = sub.submitted_by_user
        ? `${sub.submitted_by_user.first_name} ${sub.submitted_by_user.last_name}`.toLowerCase()
        : '';
      const formNumber = sub.form_number.toLowerCase();
      
      if (!userName.includes(searchLower) && !formNumber.includes(searchLower)) {
        return false;
      }
    }
    
    // Status filter
    if (statusFilter !== 'all' && sub.status !== statusFilter) {
      return false;
    }
    
    // Date filter
    if (dateFilter !== 'all') {
      const subDate = new Date(sub.created_at);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          if (subDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (subDate < weekAgo) return false;
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (subDate < monthStart) return false;
          break;
      }
    }
    
    return true;
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default" className="bg-blue-500"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Form Number', 'Submitted By', 'Submitted At', 'Status', 'Jobsite'];
    const rows = filteredSubmissions.map(sub => [
      sub.form_number,
      sub.submitted_by_user ? `${sub.submitted_by_user.first_name} ${sub.submitted_by_user.last_name}` : 'Unknown',
      new Date(sub.created_at).toLocaleString(),
      sub.status,
      sub.jobsite_name || '',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template?.form_code || 'form'}-submissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Get icon
  const getIcon = (iconName: string) => {
    const name = iconName.replace(/-/g, '').replace(/^\w/, c => c.toUpperCase());
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
    // Safe: name is derived from iconName with string transformations, fallback provided
    // eslint-disable-next-line security/detect-object-injection
    return icons[name] || FileText;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    );
  }
  
  const Icon = getIcon(template.icon);
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/form-templates')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-3">
            <div
              className="rounded-lg p-2.5"
              style={{ backgroundColor: `${template.color}20` }}
            >
              <Icon className="h-6 w-6" style={{ color: template.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{template.name}</h1>
              <p className="text-muted-foreground">Submissions</p>
            </div>
          </div>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{stats.thisMonth}</p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or form number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Submissions Table */}
        <Card>
          <CardContent className="p-0">
            {filteredSubmissions.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No submissions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Number</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Jobsite</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-mono text-sm">
                        {submission.form_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {submission.submitted_by_user ? (
                            <span>
                              {submission.submitted_by_user.first_name}{' '}
                              {submission.submitted_by_user.last_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(submission.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {submission.jobsite_name ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {submission.jobsite_name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/form-templates/${templateId}/submissions/${submission.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
