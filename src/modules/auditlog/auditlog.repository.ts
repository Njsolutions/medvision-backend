import { db } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { AuditLogData, ImpactLevel } from '@/types/audit.types'

const USER_SELECT = { id: true, name: true, email: true, role: true } as const

export interface AuditLogFilters {
  userId?: string
  action?: string
  impactLevel?: ImpactLevel
  search?: string
  startDate?: Date
  endDate?: Date
}

function buildWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {}

  if (filters.userId) where.userId = filters.userId
  if (filters.action) where.action = filters.action
  if (filters.impactLevel) where.impactLevel = filters.impactLevel
  if (filters.startDate || filters.endDate) {
    where.timestamp = {
      ...(filters.startDate && { gte: filters.startDate }),
      ...(filters.endDate && { lte: filters.endDate }),
    }
  }
  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { user: { name: { contains: filters.search, mode: 'insensitive' } } },
      { user: { email: { contains: filters.search, mode: 'insensitive' } } },
    ]
  }

  return where
}

export class AuditLogRepository {
  async create(data: AuditLogData) {
    return await db.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        description: data.description,
        content: data.content as never,
        impactLevel: data.impactLevel,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
      include: { user: { select: USER_SELECT } },
    })
  }

  async findMany(filters: AuditLogFilters, limit = 50, offset = 0) {
    return await db.auditLog.findMany({
      where: buildWhere(filters),
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: { user: { select: USER_SELECT } },
    })
  }

  async count(filters: AuditLogFilters = {}): Promise<number> {
    return await db.auditLog.count({ where: buildWhere(filters) })
  }

  async countByImpactLevel(): Promise<Record<ImpactLevel, number>> {
    const groups = await db.auditLog.groupBy({
      by: ['impactLevel'],
      _count: { _all: true },
    })
    const result: Record<ImpactLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 }
    for (const group of groups) result[group.impactLevel] = group._count._all
    return result
  }

  async listActions(): Promise<string[]> {
    const groups = await db.auditLog.groupBy({ by: ['action'], orderBy: { action: 'asc' } })
    return groups.map((group) => group.action)
  }
}

export const auditLogRepository = new AuditLogRepository()
