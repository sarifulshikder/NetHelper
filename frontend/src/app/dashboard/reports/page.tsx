'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FileText, Download, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  entityType: string;
  selectedFields: string[];
}

interface ReportJob {
  id: string;
  templateId: string;
  templateName: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  progress: number;
  fileUrl?: string;
  errorMessage?: string;
}

export default function ReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [jobs, setJobs] = useState<ReportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch report templates
        const templatesResponse = await fetch('/api/bi/reports/templates');
        if (!templatesResponse.ok) {
          throw new Error('Failed to fetch report templates');
        }
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData);

        // Fetch report jobs
        const jobsResponse = await fetch('/api/bi/reports/jobs/completed');
        if (!jobsResponse.ok) {
          throw new Error('Failed to fetch report jobs');
        }
        const jobsData = await jobsResponse.json();
        setJobs(jobsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRunReport = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(`/api/bi/reports/templates/${selectedTemplate}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to run report');
      }

      const newJob = await response.json();
      setJobs([...jobs, newJob]);
      setIsDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDownload = async (jobId: string) => {
    try {
      const response = await fetch(`/api/bi/reports/jobs/${jobId}/download`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${jobId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Queued</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'PROCESSING':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'FAILED':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 p-4 bg-red-50 rounded">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Business Intelligence Reports</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600">
              <FileText className="mr-2 h-4 w-4" />
              Create New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Report</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="template" className="text-right text-sm font-medium">
                  Report Template
                </label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select report template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTemplate && (
                <div className="col-span-4 p-4 bg-gray-50 rounded">
                  <h3 className="font-medium mb-2">Template Details</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {templates.find(t => t.id === selectedTemplate)?.description}
                  </p>
                  <div className="text-sm">
                    <p className="font-medium">Fields:</p>
                    <p className="text-gray-600">
                      {templates.find(t => t.id === selectedTemplate)?.selectedFields.join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-blue-500 hover:bg-blue-600"
                onClick={handleRunReport}
                disabled={!selectedTemplate}
              >
                Run Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-gray-500 mt-1">Available report templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Reports</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {jobs.filter(j => j.status === 'COMPLETED').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Successfully completed reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {jobs.filter(j => j.status === 'QUEUED' || j.status === 'PROCESSING').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Reports in queue or processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Templates */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Available Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No report templates available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Fields</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{template.description}</TableCell>
                    <TableCell>{template.entityType}</TableCell>
                    <TableCell>{template.selectedFields.join(', ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Report Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Report Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No report jobs found. Create a new report to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.templateName}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(job.status)}
                        {getStatusBadge(job.status)}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{new Date(job.updatedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                          <div
                            className={`h-2.5 rounded-full ${
                              job.status === 'COMPLETED' ? 'bg-green-600' :
                              job.status === 'FAILED' ? 'bg-red-600' :
                              'bg-blue-600'
                            }`}
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{job.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.status === 'COMPLETED' && job.fileUrl ? (
                        <Button
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => handleDownload(job.id)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Report Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Our BI reporting engine allows you to generate custom reports from your data.</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
              <li>Reports are processed asynchronously to handle large datasets efficiently</li>
              <li>Download completed reports in CSV format for further analysis</li>
              <li>Monitor report progress in real-time</li>
              <li>Create custom templates for your specific reporting needs</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
