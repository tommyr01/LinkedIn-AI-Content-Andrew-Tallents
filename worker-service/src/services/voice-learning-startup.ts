interface InitializationStatus {
  is_initialized: boolean;
  config: {
    autoStartMonitoring: boolean;
    runInitialAnalysis: boolean;
    maxInitialAnalysisDays: number;
    maxInitialPosts: number;
    delayStartupSeconds?: number;
  };
  scheduler_status?: {
    isRunning: boolean;
    monitoringStatus?: {
      isRunning: boolean;
      uptime: number | null;
    };
  };
}

class VoiceLearningStartupService {
  private initialized = false;
  private config = {
    autoStartMonitoring: true,
    runInitialAnalysis: true,
    maxInitialAnalysisDays: 30,
    maxInitialPosts: 50,
    delayStartupSeconds: 0
  };

  getInitializationStatus(): InitializationStatus {
    return {
      is_initialized: this.initialized,
      config: this.config,
      scheduler_status: this.initialized ? {
        isRunning: true,
        monitoringStatus: {
          isRunning: true,
          uptime: Date.now() - 1000 * 60 * 60
        }
      } : undefined
    };
  }

  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async initializeVoiceLearning(): Promise<{
    success: boolean;
    services_started: string[];
    errors: string[];
    summary: string;
  }> {
    // Mock implementation
    this.initialized = true;
    return {
      success: true,
      services_started: ['scheduler', 'monitoring', 'analysis'],
      errors: [],
      summary: 'Voice learning system initialized successfully'
    };
  }

  async shutdownVoiceLearning(): Promise<void> {
    this.initialized = false;
  }
}

export const voiceLearningStartupService = new VoiceLearningStartupService();