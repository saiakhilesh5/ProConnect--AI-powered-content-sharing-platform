"use client"
import React, { useState, useEffect } from 'react';
import { useAIFeatures } from '@/hooks/useAIFeatures';
import {
  TrendingUp, Clock, Tag, Users, Zap, Target,
  RefreshCw, Loader2, Sparkles, ChevronDown, ChevronUp,
  BarChart2, Star, AlertCircle, CheckCircle
} from 'lucide-react';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SectionCard = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
};

const MetricBadge = ({ value, label, color = 'violet' }) => {
  const colors = {
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <div className={`inline-flex flex-col items-center px-4 py-3 rounded-lg border ${colors[color]}`}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs mt-0.5 opacity-75">{label}</span>
    </div>
  );
};

const AIInsightsTab = () => {
  const { getGrowthRecommendations, getCompetitorInsights } = useAIFeatures();
  const [growth, setGrowth] = useState(null);
  const [competitors, setCompetitors] = useState(null);
  const [loadingGrowth, setLoadingGrowth] = useState(true);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [error, setError] = useState(null);

  const fetchGrowth = async () => {
    setLoadingGrowth(true);
    setError(null);
    try {
      const data = await getGrowthRecommendations();
      setGrowth(data);
    } catch (err) {
      setError('Could not load AI insights. Please try again.');
    } finally {
      setLoadingGrowth(false);
    }
  };

  const fetchCompetitors = async () => {
    setLoadingCompetitors(true);
    try {
      const data = await getCompetitorInsights();
      setCompetitors(data);
      setShowCompetitors(true);
    } catch (err) {
      // silently fail
    } finally {
      setLoadingCompetitors(false);
    }
  };

  useEffect(() => {
    fetchGrowth();
  }, []);

  if (loadingGrowth) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <Sparkles className="w-10 h-10 text-violet-400 animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm">Analyzing your creator profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <button
          onClick={fetchGrowth}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!growth) return null;

  const { postingAnalysis, topPerformingContent, growthRecommendations, hashtagStrategy, contentStrategy } = growth;

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-bold">AI Creator Insights</h2>
        </div>
        <button
          onClick={fetchGrowth}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      {postingAnalysis && (
        <div className="flex flex-wrap gap-3">
          <MetricBadge value={postingAnalysis.totalPosts} label="Posts" color="violet" />
          {postingAnalysis.bestDays?.[0] && (
            <MetricBadge value={postingAnalysis.bestDays[0].day?.slice(0, 3)} label="Best Day" color="emerald" />
          )}
          {postingAnalysis.bestHours?.[0] && (
            <MetricBadge value={`${postingAnalysis.bestHours[0].hour}:00`} label="Best Hour" color="amber" />
          )}
          {postingAnalysis.postingFrequency?.avgPerWeek !== undefined && (
            <MetricBadge value={postingAnalysis.postingFrequency.avgPerWeek} label="Posts/Week" color="blue" />
          )}
        </div>
      )}

      {/* Best Posting Times */}
      {postingAnalysis?.bestHours?.length > 0 && (
        <SectionCard title="Best Posting Times" icon={Clock}>
          <div className="space-y-2 mt-1">
            {postingAnalysis.bestHours.slice(0, 3).map((slot, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                  <span className="text-sm">{slot.timeSlot}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-violet-500/20 w-24">
                    <div
                      className="h-2 rounded-full bg-violet-500"
                      style={{
                        width: `${Math.min(100, (slot.avgEngagement / (postingAnalysis.bestHours[0].avgEngagement || 1)) * 100)}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{slot.avgEngagement} eng.</span>
                </div>
              </div>
            ))}
          </div>
          {postingAnalysis.bestDays?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Best days to post:</p>
              <div className="flex gap-2 flex-wrap">
                {postingAnalysis.bestDays.slice(0, 3).map((d, i) => (
                  <span key={i} className="px-2.5 py-1 bg-violet-500/10 text-violet-300 rounded-full text-xs border border-violet-500/20">
                    {d.day}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* AI Growth Recommendations */}
      {growthRecommendations?.length > 0 && (
        <SectionCard title="AI Growth Recommendations" icon={Target}>
          <ul className="mt-1 space-y-3">
            {growthRecommendations.map((rec, i) => (
              <li key={i} className="flex gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80">{rec}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Hashtag Strategy */}
      {hashtagStrategy && (
        <SectionCard title="Hashtag Strategy" icon={Tag}>
          {hashtagStrategy.recommendedTags?.length > 0 && (
            <div className="mt-1">
              <p className="text-xs text-muted-foreground mb-2">Recommended hashtags:</p>
              <div className="flex flex-wrap gap-2">
                {hashtagStrategy.recommendedTags.slice(0, 10).map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 bg-secondary text-foreground rounded-full text-xs border border-border hover:bg-secondary/80 cursor-pointer">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {hashtagStrategy.strategy && (
            <p className="text-sm text-foreground/70 mt-3">{hashtagStrategy.strategy}</p>
          )}
        </SectionCard>
      )}

      {/* Content Strategy */}
      {contentStrategy && (
        <SectionCard title="Content Strategy" icon={Zap}>
          {contentStrategy.topCategories?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Top performing categories:</p>
              <div className="flex flex-wrap gap-2">
                {contentStrategy.topCategories.slice(0, 5).map((cat, i) => (
                  <span key={i} className="px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-full text-xs border border-amber-500/20 capitalize">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
          {contentStrategy.recommendations?.length > 0 && (
            <ul className="space-y-2 mt-2">
              {contentStrategy.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/80">
                  <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {/* Top Performing Content */}
      {topPerformingContent?.length > 0 && (
        <SectionCard title="Your Top Performing Posts" icon={BarChart2} defaultOpen={false}>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {topPerformingContent.slice(0, 6).map((post, i) => (
              <a key={i} href={`/image/${post._id}`} className="group">
                <div className="aspect-square rounded-lg overflow-hidden bg-secondary border border-border">
                  <img
                    src={post.imageUrl}
                    alt={post.title || 'Post'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {post.likesCount || 0} likes
                </p>
              </a>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Competitor Insights */}
      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-sm">Competitor Insights</span>
          </div>
          {!showCompetitors && (
            <button
              onClick={fetchCompetitors}
              disabled={loadingCompetitors}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20"
            >
              {loadingCompetitors ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              {loadingCompetitors ? 'Analyzing...' : 'Analyze Competitors'}
            </button>
          )}
        </div>

        {showCompetitors && competitors && (
          <div className="mt-4 space-y-3">
            {competitors.insights?.length > 0 && (
              <ul className="space-y-2">
                {competitors.insights.slice(0, 5).map((insight, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                    {insight}
                  </li>
                ))}
              </ul>
            )}
            {competitors.trendingTopics?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Trending in your niche:</p>
                <div className="flex flex-wrap gap-2">
                  {competitors.trendingTopics.slice(0, 8).map((topic, i) => (
                    <span key={i} className="px-2.5 py-1 bg-blue-500/10 text-blue-300 rounded-full text-xs border border-blue-500/20">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!showCompetitors && !loadingCompetitors && (
          <p className="text-xs text-muted-foreground mt-2">
            Get insights on trending content and strategies used by top creators in your niche.
          </p>
        )}
      </div>
    </div>
  );
};

export default AIInsightsTab;
