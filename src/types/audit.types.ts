export enum ImpactLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

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
