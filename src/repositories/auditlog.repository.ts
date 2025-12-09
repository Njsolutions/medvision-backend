import { db } from '../lib/prisma'
import type { AuditLogData } from '../types/audit.types'

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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0
  ) {
    return await db.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  async findByAction(
    action: string,
    limit = 50,
    offset = 0
  ) {
    return await db.auditLog.findMany({
      where: { action },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  async findByImpactLevel(
    impactLevel: string,
    limit = 50,
    offset = 0
  ) {
    return await db.auditLog.findMany({
      where: { impactLevel: impactLevel as 'low' | 'medium' | 'high' | 'critical' },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    limit = 50,
    offset = 0
  ) {
    return await db.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  async findAll(limit = 50, offset = 0) {
    return await db.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  async count(filters?: {
    userId?: string
    action?: string
    impactLevel?: string
    startDate?: Date
    endDate?: Date
  }): Promise<number> {
    const where: {
      userId?: string
      action?: string
      impactLevel?: 'low' | 'medium' | 'high' | 'critical'
      timestamp?: { gte?: Date; lte?: Date }
    } = {}

    if (filters?.userId) where.userId = filters.userId
    if (filters?.action) where.action = filters.action
    if (filters?.impactLevel) where.impactLevel = filters.impactLevel as 'low' | 'medium' | 'high' | 'critical'
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {}
      if (filters.startDate) where.timestamp.gte = filters.startDate
      if (filters.endDate) where.timestamp.lte = filters.endDate
    }

    return await db.auditLog.count({ where })
  }
}

export const auditLogRepository = new AuditLogRepository()
