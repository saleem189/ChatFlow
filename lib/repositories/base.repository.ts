// ================================
// Base Repository
// ================================
// Abstract base class for all repositories
// Provides common CRUD operations

import { PrismaClient, Prisma } from '@prisma/client';

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    return (this.prisma[this.modelName as keyof PrismaClient] as any).findUnique({
      where: { id },
    });
  }

  /**
   * Find many records with optional filters
   */
  async findMany(
    where?: Prisma.Args<T, 'findMany'>['where'],
    options?: {
      take?: number;
      skip?: number;
      orderBy?: Prisma.Args<T, 'findMany'>['orderBy'];
      include?: Prisma.Args<T, 'findMany'>['include'];
      select?: Prisma.Args<T, 'findMany'>['select'];
    }
  ): Promise<T[]> {
    return (this.prisma[this.modelName as keyof PrismaClient] as any).findMany({
      where,
      ...options,
    });
  }

  /**
   * Find first record matching criteria
   */
  async findFirst(
    where?: Prisma.Args<T, 'findFirst'>['where'],
    options?: {
      include?: Prisma.Args<T, 'findFirst'>['include'];
      select?: Prisma.Args<T, 'findFirst'>['select'];
    }
  ): Promise<T | null> {
    return (this.prisma[this.modelName as keyof PrismaClient] as any).findFirst({
      where,
      ...options,
    });
  }

  /**
   * Create a new record
   */
  async create(data: CreateInput): Promise<T> {
    return (this.prisma[this.modelName as keyof PrismaClient] as any).create({
      data,
    });
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: UpdateInput): Promise<T> {
    return (this.prisma[this.modelName as keyof PrismaClient] as any).update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<T> {
    return (this.prisma[this.modelName as keyof PrismaClient] as any).delete({
      where: { id },
    });
  }

  /**
   * Count records matching criteria
   */
  async count(where?: Prisma.Args<T, 'count'>['where']): Promise<number> {
    return (this.prisma[this.modelName as keyof PrismaClient] as any).count({
      where,
    });
  }

  /**
   * Upsert a record (create or update)
   */
  async upsert(
    where: Prisma.Args<T, 'upsert'>['where'],
    create: CreateInput,
    update: UpdateInput
  ): Promise<T> {
    return (this.prisma[this.modelName as keyof PrismaClient] as any).upsert({
      where,
      create,
      update,
    });
  }

  /**
   * Get the Prisma client instance
   * Useful for complex queries that don't fit the standard CRUD pattern
   */
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }
}

