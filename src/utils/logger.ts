
type LogLevel = "info" | "warn" | "error" | "debug";

const isProduction = process.env.NODE_ENV === "production";

function formatMessage(level: LogLevel, context: string, message: string, meta?: Record<string, unknown>): string {
  if (isProduction) {
    // Structured JSON logging for production
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
    };
    if (meta) {
      entry.meta = meta;
    }
    return JSON.stringify(entry);
  }

  // Human-readable for development
  const prefix = `[${level.toUpperCase()}] [${context}]`;
  if (meta) {
    return `${prefix} ${message} ${JSON.stringify(meta)}`;
  }
  return `${prefix} ${message}`;
}

function info(context: string, message: string, meta?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(formatMessage("info", context, message, meta));
}

function warn(context: string, message: string, meta?: Record<string, unknown>) {
  console.warn(formatMessage("warn", context, message, meta));
}

function error(context: string, message: string, meta?: Record<string, unknown>) {
  console.error(formatMessage("error", context, message, meta));
}

function debug(context: string, message: string, meta?: Record<string, unknown>) {
  if (!isProduction) {
    // eslint-disable-next-line no-console
    console.log(formatMessage("debug", context, message, meta));
  }
}

const logger = { info, warn, error, debug };

export default logger;