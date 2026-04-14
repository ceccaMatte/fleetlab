import { PrismaClient, type Prisma } from "@prisma/client";

export interface CreateDatabaseClientOptions {
  databaseUrl: string;
}

export interface DatabaseClient {
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
