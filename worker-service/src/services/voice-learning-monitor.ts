interface MonitoringStatus {
  isRunning: boolean;
  lastCheckedTimestamp: string | null;
  checkInterval: number;
  uptime: number | null;
}

class VoiceLearningMonitorService {
  private isActive = false;
  private startTime: number | null = null;

  getMonitoringStatus(): MonitoringStatus {
    return {
      isRunning: this.isActive,
      lastCheckedTimestamp: this.isActive ? new Date().toISOString() : null,
      checkInterval: 30000, // 30 seconds
      uptime: this.startTime ? Date.now() - this.startTime : null
    };
  }

  async startMonitoring(): Promise<void> {
    this.isActive = true;
    this.startTime = Date.now();
  }

  stopMonitoring(): void {
    this.isActive = false;
    this.startTime = null;
  }

  async analyzeHistoricalPosts(daysSince: number, limit: number): Promise<{
    processed: number;
    failed: number;
    insights: {
      avgAuthenticity: number;
      avgAuthority: number;
      avgVulnerability: number;
      dominantTone: string;
      keyPatterns: string[];
    };
  }> {
    // Mock implementation
    return {
      processed: Math.min(limit, 25),
      failed: 0,
      insights: {
        avgAuthenticity: 85,
        avgAuthority: 78,
        avgVulnerability: 65,
        dominantTone: 'conversational',
        keyPatterns: ['storytelling', 'data-driven', 'personal experience']
      }
    };
  }

  async triggerManualAnalysis(postIds: string[]): Promise<{
    processed: number;
    failed: number;
    results: any[];
  }> {
    // Mock implementation
    return {
      processed: postIds.length,
      failed: 0,
      results: postIds.map(id => ({ id, status: 'analyzed' }))
    };
  }
}

export const voiceLearningMonitorService = new VoiceLearningMonitorService();