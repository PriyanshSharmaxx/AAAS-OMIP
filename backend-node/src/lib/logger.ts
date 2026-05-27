import winston from "winston";
import { env } from "./config";
import { getRequestId } from "../middleware/requestContext";

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  printf(({ level, message, timestamp, ...meta }) => {
    const requestId = getRequestId();
    const ridStr = requestId ? ` [${requestId.slice(0, 8)}]` : "";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp}${ridStr} [${level}] ${message}${metaStr}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  winston.format((info) => {
    const requestId = getRequestId();
    if (requestId) info.requestId = requestId;
    return info;
  })(),
  json(),
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...(env.NODE_ENV === "production"
      ? [new winston.transports.File({ filename: "logs/error.log", level: "error" }),
         new winston.transports.File({ filename: "logs/combined.log" })]
      : []),
  ],
});
