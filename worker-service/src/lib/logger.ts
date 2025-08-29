import pino from 'pino'
import { appConfig } from '../config'

const isDevelopment = appConfig.environment === 'development'
const isNextJs = typeof process !== 'undefined' && (process.env.NEXT_RUNTIME || process.env.__NEXT_PRIVATE_PREBUNDLED_REACT)

// Use simple JSON logging for Next.js environment, pretty logging for standalone worker
export const logger = pino({
  level: appConfig.logging.level,
  // Only use pino-pretty for standalone worker service, not in Next.js
  ...(isDevelopment && !isNextJs && typeof require !== 'undefined' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss',
        singleLine: false
      }
    }
  }),
  // For Next.js or when pino-pretty isn't available, use simple console-friendly format
  formatters: {
    level(label) {
      return { level: label }
    },
    log(object) {
      return {
        ...object,
        timestamp: new Date().toISOString()
      }
    }
  }
})

export default logger