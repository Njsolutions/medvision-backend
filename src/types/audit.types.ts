export const ImpactLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const

export type ImpactLevel = (typeof ImpactLevel)[keyof typeof ImpactLevel]

export interface AuditLogData {
  userId: string
  action: string
  description: string
  content?: Record<string, unknown>
  impactLevel: ImpactLevel
  ipAddress?: string
  userAgent?: string
}

export interface AuditContext {
  userId?: string
  ipAddress?: string
  userAgent?: string
}
