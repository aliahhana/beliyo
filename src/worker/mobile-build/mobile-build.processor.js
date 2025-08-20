import { SftpClient } from 'some-sftp-library'

class MobileBuildProcessor {
  // Main deployment method with enhanced null safety
  async _MobileBuildProcessor_deployToSftp(buildConfig) {
    // Always ensure we have a valid config object
    const config = this._ensureValidConfig(buildConfig)
    
    // Safely extract properties with defaults
    const isPublic = Boolean(config?.isPublic ?? false)
    const deployPath = config?.deployPath ?? '/mobile/builds'
    const serverConfig = config?.serverConfig ?? this.getDefaultServerConfig()

    console.log('[DEBUG] Deployment config validated:', {
      isPublic,
      deployPath,
      serverConfig: serverConfig ? '***' : 'null'
    })

    try {
      const sftpClient = new SftpClient()
      const result = isPublic 
        ? await this.deployPublic(sftpClient, deployPath, serverConfig)
        : await this.deployPrivate(sftpClient, deployPath, serverConfig)
      
      return { 
        success: true,
        isPublic,
        deployPath,
        ...result
      }
    } catch (error) {
      console.error('[ERROR] Deployment failed:', error)
      throw new Error(`SFTP deployment failed: ${error.message}`)
    }
  }

  // Core build method with complete null safety
  async _MobileBuildProcessor_buildMobilePreview(jobData) {
    try {
      console.log('[DEBUG] Starting build with jobData:', jobData ? 'valid' : 'null')
      
      // Get validated config from multiple possible sources
      const buildConfig = this._resolveBuildConfig(jobData)
      console.log('[DEBUG] Resolved build config:', buildConfig)

      const result = await this._MobileBuildProcessor_deployToSftp(buildConfig)
      return {
        success: true,
        message: 'Mobile preview built successfully',
        ...result
      }
    } catch (error) {
      console.error('[ERROR] Build failed:', error)
      throw error
    }
  }

  // Helper methods for config validation
  _ensureValidConfig(config) {
    if (typeof config !== 'object' || config === null) {
      console.warn('[WARN] Invalid config provided, using defaults')
      return {
        isPublic: false,
        deployPath: '/mobile/builds',
        serverConfig: this.getDefaultServerConfig()
      }
    }
    return config
  }

  _resolveBuildConfig(jobData) {
    const safeJobData = this._ensureValidConfig(jobData)
    
    // Check all possible config locations
    const configSources = [
      safeJobData.buildConfig,
      safeJobData.config,
      safeJobData
    ].filter(Boolean)

    // Merge all valid configs with later sources overriding earlier ones
    const mergedConfig = Object.assign(
      {
        isPublic: false,
        deployPath: '/mobile/builds',
        serverConfig: this.getDefaultServerConfig()
      },
      ...configSources
    )

    return mergedConfig
  }

  getDefaultServerConfig() {
    return {
      host: process.env.SFTP_HOST || 'localhost',
      port: parseInt(process.env.SFTP_PORT || '22', 10),
      username: process.env.SFTP_USER || 'deploy',
      password: process.env.SFTP_PASSWORD || ''
    }
  }

  // Public API method with complete error handling
  async processMobileBuild(jobData) {
    try {
      const result = await this._MobileBuildProcessor_buildMobilePreview(jobData)
      return {
        ...result,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
        message: 'Mobile build processing failed',
        timestamp: new Date().toISOString()
      }
    }
  }

  // Deployment implementations (unchanged)
  async deployPublic(sftpClient, deployPath, serverConfig) {
    console.log(`[INFO] Deploying to public path: ${deployPath}`)
    return { deployed: true, type: 'public' }
  }

  async deployPrivate(sftpClient, deployPath, serverConfig) {
    console.log(`[INFO] Deploying to private path: ${deployPath}`)
    return { deployed: true, type: 'private' }
  }
}

export default MobileBuildProcessor
