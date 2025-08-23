import { SftpClient } from 'some-sftp-library'

class MobileBuildProcessor {
  // Main deployment method with enhanced null safety
  async _MobileBuildProcessor_deployToSftp(buildConfig) {
    // Always ensure we have a valid config object with null safety
    const config = this._ensureValidConfig(buildConfig)
    
    // Safely extract properties with defaults and explicit null checks
    const isPublic = this._safeGetBoolean(config, 'isPublic', false)
    const deployPath = this._safeGetString(config, 'deployPath', '/mobile/builds')
    const serverConfig = this._safeGetObject(config, 'serverConfig') || this.getDefaultServerConfig()

    console.log('[DEBUG] Deployment config validated:', {
      isPublic,
      deployPath,
      serverConfig: serverConfig ? '***' : 'null',
      originalConfig: config ? 'valid' : 'null'
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

  // Enhanced helper methods for safe property access
  _safeGetBoolean(obj, key, defaultValue = false) {
    if (!obj || typeof obj !== 'object') {
      console.warn(`[WARN] Cannot access ${key} on invalid object, using default: ${defaultValue}`)
      return defaultValue
    }
    
    const value = obj[key]
    if (value === null || value === undefined) {
      console.warn(`[WARN] Property ${key} is null/undefined, using default: ${defaultValue}`)
      return defaultValue
    }
    
    return Boolean(value)
  }

  _safeGetString(obj, key, defaultValue = '') {
    if (!obj || typeof obj !== 'object') {
      console.warn(`[WARN] Cannot access ${key} on invalid object, using default: ${defaultValue}`)
      return defaultValue
    }
    
    const value = obj[key]
    if (value === null || value === undefined) {
      console.warn(`[WARN] Property ${key} is null/undefined, using default: ${defaultValue}`)
      return defaultValue
    }
    
    return String(value)
  }

  _safeGetObject(obj, key) {
    if (!obj || typeof obj !== 'object') {
      console.warn(`[WARN] Cannot access ${key} on invalid object`)
      return null
    }
    
    const value = obj[key]
    if (value === null || value === undefined) {
      console.warn(`[WARN] Property ${key} is null/undefined`)
      return null
    }
    
    if (typeof value !== 'object') {
      console.warn(`[WARN] Property ${key} is not an object`)
      return null
    }
    
    return value
  }

  // Helper methods for config validation
  _ensureValidConfig(config) {
    if (typeof config !== 'object' || config === null) {
      console.warn('[WARN] Invalid config provided, creating default config')
      return {
        isPublic: false,
        deployPath: '/mobile/builds',
        serverConfig: this.getDefaultServerConfig()
      }
    }
    return config
  }

  _resolveBuildConfig(jobData) {
    // Start with safe defaults
    const defaultConfig = {
      isPublic: false,
      deployPath: '/mobile/builds',
      serverConfig: this.getDefaultServerConfig()
    }

    // If jobData is null/invalid, return defaults
    if (!jobData || typeof jobData !== 'object') {
      console.warn('[WARN] Invalid jobData provided, using default config')
      return defaultConfig
    }
    
    // Check all possible config locations safely
    const configSources = []
    
    if (this._safeGetObject(jobData, 'buildConfig')) {
      configSources.push(jobData.buildConfig)
    }
    
    if (this._safeGetObject(jobData, 'config')) {
      configSources.push(jobData.config)
    }
    
    // Add jobData itself as a potential config source
    configSources.push(jobData)

    // Merge all valid configs with later sources overriding earlier ones
    const mergedConfig = Object.assign(defaultConfig, ...configSources)

    console.log('[DEBUG] Config resolution:', {
      sourcesFound: configSources.length,
      finalConfig: {
        isPublic: mergedConfig.isPublic,
        deployPath: mergedConfig.deployPath,
        hasServerConfig: !!mergedConfig.serverConfig
      }
    })

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
      console.error('[ERROR] Mobile build processing failed:', {
        message: error.message,
        stack: error.stack,
        jobData: jobData ? 'present' : 'null'
      })
      
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
