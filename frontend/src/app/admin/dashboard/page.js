"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Image as ImageIcon, 
  Heart, 
  MessageSquare,
  TrendingUp,
  TrendingDown,
  FileText,
  Loader2,
  Download,
  Calendar,
  Sparkles,
  AlertTriangle,
  Shield,
  BarChart3,
  RefreshCw,
  Clock
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('weekly');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const getAdminToken = () => localStorage.getItem('adminToken');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      const [quickStatsRes, overviewRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/quick-stats`, {
          headers: { 'x-admin-token': token }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/overview`, {
          headers: { 'x-admin-token': token }
        })
      ]);
      
      setStats({
        quickStats: quickStatsRes.data.data,
        overview: overviewRes.data.data
      });
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      setReport(null);
      const token = getAdminToken();
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/generate-report`,
        { period: reportPeriod },
        { headers: { 'x-admin-token': token } }
      );
      
      setReport(response.data.data);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate AI report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    
    const content = `# ProConnect Platform Report\n\nGenerated: ${new Date().toISOString()}\nPeriod: ${reportPeriod}\n\n${report.aiReport}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proconnect-${reportPeriod}-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Simple markdown renderer
  const renderMarkdown = (text) => {
    if (!text) return null;
    
    return text.split('\n').map((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium text-foreground/80 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-foreground mt-6 mb-3">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-primary mb-4">{line.replace('# ', '')}</h1>;
      }
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={index} className="text-muted-foreground ml-4 list-disc">{line.replace(/^[-*] /, '')}</li>;
      }
      // Numbered list
      if (/^\d+\. /.test(line)) {
        return <li key={index} className="text-muted-foreground ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
      }
      // Bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} className="text-muted-foreground mb-2">
            {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-foreground font-semibold">{part}</strong> : part)}
          </p>
        );
      }
      // Empty line
      if (line.trim() === '') {
        return <br key={index} />;
      }
      // Normal paragraph
      return <p key={index} className="text-muted-foreground mb-2">{line}</p>;
    });
  };

  const StatCard = ({ title, value, icon: Icon, change, changeLabel, gradient }) => (
    <div className="bg-card/50 rounded-2xl border border-border p-6 hover:border-border/80 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-foreground mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-muted-foreground text-sm">{title}</div>
      {changeLabel && <div className="text-muted-foreground/60 text-xs mt-1">{changeLabel}</div>}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Welcome to ProConnect Control Panel</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl flex items-center gap-2 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Quick Stats */}
      {stats?.quickStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats.quickStats.users?.total || 0}
            icon={Users}
            change={stats.quickStats.users?.weeklyGrowth}
            changeLabel="vs last week"
            gradient="from-blue-600 to-cyan-600"
          />
          <StatCard
            title="Total Images"
            value={stats.quickStats.images?.total || 0}
            icon={ImageIcon}
            change={stats.quickStats.images?.weeklyGrowth}
            changeLabel="vs last week"
            gradient="from-violet-600 to-fuchsia-600"
          />
          <StatCard
            title="Total Likes"
            value={stats.quickStats.likes?.total || 0}
            icon={Heart}
            change={stats.quickStats.likes?.weeklyGrowth}
            changeLabel="vs last week"
            gradient="from-rose-600 to-pink-600"
          />
          <StatCard
            title="Total Comments"
            value={stats.quickStats.comments?.total || 0}
            icon={MessageSquare}
            change={stats.quickStats.comments?.weeklyGrowth}
            changeLabel="vs last week"
            gradient="from-amber-600 to-orange-600"
          />
        </div>
      )}

      {/* Platform Overview */}
      {stats?.overview && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="bg-card/50 rounded-2xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Platform Activity
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Users Today</span>
                <span className="text-foreground font-medium">{stats.overview.usersToday || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Uploads Today</span>
                <span className="text-foreground font-medium">{stats.overview.uploadsToday || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Comments Today</span>
                <span className="text-foreground font-medium">{stats.overview.commentsToday || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Users (7d)</span>
                <span className="text-foreground font-medium">{stats.overview.activeUsers7d || 0}</span>
              </div>
            </div>
          </div>

          {/* Top Tags */}
          <div className="bg-card/50 rounded-2xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Trending Tags</h3>
            <div className="flex flex-wrap gap-2">
              {stats.overview.topTags?.slice(0, 10).map((tag, index) => (
                <span
                  key={tag._id}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    index < 3 
                      ? 'bg-gradient-to-r from-primary to-accent text-white' 
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  #{tag._id} ({tag.count})
                </span>
              )) || <span className="text-muted-foreground">No tags yet</span>}
            </div>
          </div>

          {/* Moderation Status */}
          <div className="bg-card/50 rounded-2xl border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Moderation Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending Reports</span>
                <span className="text-amber-400 font-medium">{stats.overview.pendingReports || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Banned Users</span>
                <span className="text-red-400 font-medium">{stats.overview.bannedUsers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Flagged Content</span>
                <span className="text-amber-400 font-medium">{stats.overview.flaggedContent || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Report Generator */}
      <div className="bg-card/50 rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                AI Report Generator
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Generate comprehensive AI-powered analytics reports
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
              >
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="quarterly">Quarterly Report</option>
              </select>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-medium rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {report && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="w-4 h-4" />
                Period: {report.period?.startDate} to {report.period?.endDate}
              </div>
              <button
                onClick={downloadReport}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
            </div>
            
            <div className="bg-secondary/50 rounded-xl p-6 overflow-auto max-h-[600px]">
              {renderMarkdown(report.aiReport)}
            </div>
          </div>
        )}

        {generatingReport && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">AI is analyzing your data...</h3>
            <p className="text-muted-foreground text-sm">
              This may take a moment. We're gathering insights from your platform data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
