import pino from 'pino';

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              destination: 2, // stderr
            },
          },
  },
  // Always write to stderr to avoid corrupting the MCP stdio transport
  pino.destination(2)
);
