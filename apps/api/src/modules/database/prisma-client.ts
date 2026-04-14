import { PrismaClient, type Prisma } from "@prisma/client";

import type { DevicePersistenceDatabaseClient } from "./device-persistence.ts";

export interface CreateDatabaseClientOptions {
  databaseUrl: string;
}

export interface DatabaseClient extends DevicePersistenceDatabaseClient {
  $disconnect(): Promise<void>;
}

export type DatabaseClientFactory = (options: CreateDatabaseClientOptions) => DatabaseClient;

export interface PrismaClientConstructor {
  new (options?: Prisma.PrismaClientOptions): DatabaseClient;
}

export function createPrismaClient(
  { databaseUrl }: CreateDatabaseClientOptions,
  PrismaClientCtor: PrismaClientConstructor = PrismaClient
): DatabaseClient {
  return new PrismaClientCtor({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
}
