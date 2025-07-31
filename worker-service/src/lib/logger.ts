import pino from 'pino'
import { appConfig } from '../config'

const isDevelopment = appConfig.environment === 'development'

export const logger = pino({
  level: appConfig.logging.level,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss',
        singleLine: false
      }
    }
  })
})

export default logger