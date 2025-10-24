/**
 * System Status Component
 * 
 * Displays platform health, performance metrics, and system status
 * for transparency and user confidence
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Zap,
  Globe,
  Shield,
  BarChart3,
  Monitor,
  Cpu,
  HardDrive,
  Network
} from 'lucide-react';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: number;
  icon: React.ReactNode;
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  responseTime: number;
  lastIncident?: Date;
}

export default function SystemStatus() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
      setRefreshInterval(30);
    }, 30000);

    const countdown = setInterval(() => {
      setRefreshInterval(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, []);

  // Mock system metrics (in production, these would come from monitoring APIs)
  const systemMetrics: SystemMetric[] = [
    {
      name: 'CPU Usage',
      value: 45,
      unit: '%',
      status: 'healthy',
      threshold: 80,
      icon: <Cpu className="h-4 w-4" />
    },
    {
      name: 'Memory Usage',
      value: 68,
      unit: '%',
      status: 'healthy',
      threshold: 85,
      icon: <Monitor className="h-4 w-4" />
    },
    {
      name: 'Disk Usage',
      value: 23,
      unit: '%',
      status: 'healthy',
      threshold: 90,
      icon: <HardDrive className="h-4 w-4" />
    },
    {
      name: 'Response Time',
      value: 125,
      unit: 'ms',
      status: 'healthy',
      threshold: 500,
      icon: <Zap className="h-4 w-4" />
    },
    {
      name: 'Active Sessions',
      value: 12,
      unit: '',
      status: 'healthy',
      threshold: 100,
      icon: <Users className="h-4 w-4" />
    },
    {
      name: 'Network I/O',
      value: 34,
      unit: 'MB/s',
      status: 'healthy',
      threshold: 100,
      icon: <Network className="h-4 w-4" />
    }
  ];

  const services: ServiceStatus[] = [
    {
      name: 'Web Application',
      status: 'operational',
      uptime: 99.98,
      responseTime: 145,
      lastIncident: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
    },
    {
      name: 'Trading Engine',
      status: 'operational',
      uptime: 99.95,
      responseTime: 89,
      lastIncident: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
    },
    {
      name: 'WebSocket Server',
      status: 'operational',
      uptime: 99.99,
      responseTime: 12,
      lastIncident: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000) // 32 days ago
    },
    {
      name: 'Database',
      status: 'operational',
      uptime: 99.97,
      responseTime: 67,
      lastIncident: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000) // 22 days ago
    },
    {
      name: 'Authentication',
      status: 'operational',
      uptime: 99.96,
      responseTime: 234,
      lastIncident: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) // 11 days ago
    },
    {
      name: 'Analytics Engine',
      status: 'operational',
      uptime: 99.94,
      responseTime: 178,
      lastIncident: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
      case 'warning':
        return 'text-yellow-600';
      case 'down':
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'down':
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-100 text-green-800">Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-800">Down</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const overallStatus = services.every(s => s.status === 'operational') ? 'operational' : 
                      services.some(s => s.status === 'down') ? 'down' : 'degraded';

  const averageUptime = services.reduce((sum, s) => sum + s.uptime, 0) / services.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6" />
          <h2 className="text-2xl font-bold">System Status</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Next update in {refreshInterval}s
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLastUpdated(new Date())}
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className={`border-2 ${
        overallStatus === 'operational' ? 'border-green-200 bg-green-50' :
        overallStatus === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
        'border-red-200 bg-red-50'
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(overallStatus)}
              <span className={getStatusColor(overallStatus)}>
                HyperTick Platform Status
              </span>
            </div>
            {getStatusBadge(overallStatus)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{averageUptime.toFixed(2)}%</div>
              <div className="text-sm text-gray-500">Average Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{services.filter(s => s.status === 'operational').length}/{services.length}</div>
              <div className="text-sm text-gray-500">Services Operational</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{systemMetrics.reduce((sum, m) => sum + (m.name === 'Active Sessions' ? m.value : 0), 0)}</div>
              <div className="text-sm text-gray-500">Active Sessions</div>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-gray-500">
                        {service.uptime.toFixed(2)}% uptime • {service.responseTime}ms response
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemMetrics.map((metric) => (
                <div key={metric.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {metric.icon}
                      <span className="font-medium">{metric.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{metric.value}{metric.unit}</span>
                      {getStatusIcon(metric.status)}
                    </div>
                  </div>
                  <Progress 
                    value={(metric.value / metric.threshold) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <div className="font-medium">All systems operational</div>
                <div className="text-sm text-gray-500">No current incidents affecting platform performance</div>
              </div>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleString()}
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <div className="font-medium">System maintenance completed</div>
                <div className="text-sm text-gray-500">Routine database optimization and security updates applied</div>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="flex-1">
                <div className="font-medium">Performance optimization deployed</div>
                <div className="text-sm text-gray-500">Improved WebSocket connection stability and reduced latency</div>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>SSL Certificate</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Valid</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Security Scanning</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Passed</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Data Encryption</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">AES-256</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Backup Status</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Current</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Platform Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Version:</span>
                <span className="font-medium">HyperTick v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Build:</span>
                <span className="font-medium">#2024.1.15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Environment:</span>
                <span className="font-medium">Production</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Region:</span>
                <span className="font-medium">US-East-1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">CDN Status:</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}