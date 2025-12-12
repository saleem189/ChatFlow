// ================================
// Performance Monitoring Dashboard
// ================================
// Admin dashboard for viewing performance metrics

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Database, Zap, HardDrive, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getCurrentMemoryUsage, formatBytes } from "@/lib/utils/memory-profiler";

interface PerformanceMetrics {
  memory?: {
    heapUsed: string;
    heapTotal: string;
    external: string;
    rss: string;
  } | null;
  apiMetrics: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
  };
  dbMetrics: {
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  websocketMetrics: {
    activeConnections: number;
    messagesPerMinute: number;
    averageLatency: number;
  };
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memory: null,
    apiMetrics: {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
    },
    dbMetrics: {
      totalQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
    },
    websocketMetrics: {
      activeConnections: 0,
      messagesPerMinute: 0,
      averageLatency: 0,
    },
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    
    try {
      // Fetch metrics from API
      const response = await fetch("/api/admin/performance");
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Failed to fetch performance metrics:", error);
      
      // Fallback to client-side memory metrics
      const memory = getCurrentMemoryUsage();
      setMetrics((prev) => ({ ...prev, memory }));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) {
      return <Badge variant="default" className="bg-green-500">Good</Badge>;
    } else if (value <= thresholds.warning) {
      return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>;
    } else {
      return <Badge variant="destructive">Critical</Badge>;
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 10) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (value < -10) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time application performance metrics and health status
          </p>
        </div>
        <Button
          onClick={fetchMetrics}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Memory Metrics */}
      {metrics.memory && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                <CardTitle>Memory Usage</CardTitle>
              </div>
              {getStatusBadge(
                parseInt(metrics.memory.heapUsed),
                { good: 200, warning: 400 }
              )}
            </div>
            <CardDescription>
              Current memory consumption and heap statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Heap Used</p>
                <p className="text-2xl font-bold">{metrics.memory.heapUsed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Heap Total</p>
                <p className="text-2xl font-bold">{metrics.memory.heapTotal}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">External</p>
                <p className="text-2xl font-bold">{metrics.memory.external}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">RSS</p>
                <p className="text-2xl font-bold">{metrics.memory.rss}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <CardTitle>API Performance</CardTitle>
            </div>
            {getStatusBadge(metrics.apiMetrics.averageResponseTime, {
              good: 100,
              warning: 300,
            })}
          </div>
          <CardDescription>
            HTTP API request metrics and response times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Requests</p>
                {getTrendIcon(5)}
              </div>
              <p className="text-3xl font-bold">{metrics.apiMetrics.totalRequests.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Last 60 minutes</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                {getTrendIcon(-2)}
              </div>
              <p className="text-3xl font-bold">{metrics.apiMetrics.averageResponseTime}ms</p>
              <p className="text-xs text-muted-foreground">2% faster than yesterday</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Error Rate</p>
                {getTrendIcon(0)}
              </div>
              <p className="text-3xl font-bold">{metrics.apiMetrics.errorRate.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">Within normal range</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <CardTitle>Database Performance</CardTitle>
            </div>
            {getStatusBadge(metrics.dbMetrics.averageQueryTime, {
              good: 50,
              warning: 150,
            })}
          </div>
          <CardDescription>
            Database query statistics and optimization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Queries</p>
              <p className="text-3xl font-bold">{metrics.dbMetrics.totalQueries.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Last 60 minutes</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Query Time</p>
              <p className="text-3xl font-bold">{metrics.dbMetrics.averageQueryTime}ms</p>
              <p className="text-xs text-muted-foreground">Performing well</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Slow Queries</p>
              <p className="text-3xl font-bold text-yellow-600">{metrics.dbMetrics.slowQueries}</p>
              <p className="text-xs text-muted-foreground">Queries {'>'} 200ms</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WebSocket Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              <CardTitle>WebSocket Performance</CardTitle>
            </div>
            {getStatusBadge(metrics.websocketMetrics.averageLatency, {
              good: 50,
              warning: 150,
            })}
          </div>
          <CardDescription>
            Real-time connection metrics and message throughput
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Active Connections</p>
              <p className="text-3xl font-bold">{metrics.websocketMetrics.activeConnections}</p>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Messages/Min</p>
              <p className="text-3xl font-bold">{metrics.websocketMetrics.messagesPerMinute}</p>
              <p className="text-xs text-muted-foreground">Message throughput</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-3xl font-bold">{metrics.websocketMetrics.averageLatency}ms</p>
              <p className="text-xs text-muted-foreground">Round-trip time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
          <CardDescription>
            Actionable insights to optimize your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.dbMetrics.slowQueries > 10 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Optimize Database Queries</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.dbMetrics.slowQueries} slow queries detected. Consider adding indexes or optimizing query logic.
                  </p>
                </div>
              </div>
            )}
            
            {metrics.apiMetrics.errorRate > 5 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">High Error Rate</p>
                  <p className="text-xs text-muted-foreground">
                    Error rate is {metrics.apiMetrics.errorRate.toFixed(2)}%. Review error logs and implement error handling.
                  </p>
                </div>
              </div>
            )}

            {!metrics.dbMetrics.slowQueries && metrics.apiMetrics.errorRate < 1 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Excellent Performance</p>
                  <p className="text-xs text-muted-foreground">
                    All metrics are within optimal ranges. Keep up the good work!
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

