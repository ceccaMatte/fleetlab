const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;

export interface ApiEnv {
  host: string;
  port: number;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const host = source.API_HOST ?? DEFAULT_HOST;
  const rawPort = source.API_PORT ?? `${DEFAULT_PORT}`;
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid API_PORT value: ${rawPort}`);
  }

  return {
    host,
    port
  };
}
