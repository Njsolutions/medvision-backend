import { auditLogRepository } from '../repositories/auditlog.repository'
import type { AuditLogData, AuditContext } from '../types/audit.types'
import { ImpactLevel } from '../types/audit.types'

export class AuditService {
  /**
   * Registra um log de auditoria
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await auditLogRepository.create(data)
    } catch (error) {
      // Não deve falhar a operação principal se o log falhar
      console.error('Erro ao registrar log de auditoria:', error)
    }
  }

  /**
   * Logs de autenticação
   */
  async logLogin(userId: string, context: AuditContext): Promise<void> {
    await this.log({
      userId,
      action: 'AUTH_LOGIN',
      description: 'Usuário realizou login no sistema',
      impactLevel: ImpactLevel.LOW,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logLogout(userId: string, context: AuditContext): Promise<void> {
    await this.log({
      userId,
      action: 'AUTH_LOGOUT',
      description: 'Usuário realizou logout do sistema',
      impactLevel: ImpactLevel.LOW,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logPasswordChange(userId: string, context: AuditContext): Promise<void> {
    await this.log({
      userId,
      action: 'AUTH_PASSWORD_CHANGE',
      description: 'Usuário alterou sua senha',
      impactLevel: ImpactLevel.HIGH,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logPasswordReset(userId: string, context: AuditContext): Promise<void> {
    await this.log({
      userId,
      action: 'AUTH_PASSWORD_RESET',
      description: 'Usuário solicitou reset de senha',
      impactLevel: ImpactLevel.HIGH,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  /**
   * Logs de usuários
   */
  async logUserCreate(
    adminId: string,
    targetUserId: string,
    role: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: 'USER_CREATE',
      description: `Criou novo usuário com role ${role}`,
      content: { targetUserId, role },
      impactLevel: ImpactLevel.MEDIUM,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logUserUpdate(
    adminId: string,
    targetUserId: string,
    changes: Record<string, unknown>,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: 'USER_UPDATE',
      description: `Atualizou dados do usuário`,
      content: { targetUserId, changes },
      impactLevel: ImpactLevel.MEDIUM,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logUserDelete(
    adminId: string,
    targetUserId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: 'USER_DELETE',
      description: `Deletou usuário do sistema`,
      content: { targetUserId },
      impactLevel: ImpactLevel.CRITICAL,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logUserActivate(
    adminId: string,
    targetUserId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: 'USER_ACTIVATE',
      description: `Ativou usuário`,
      content: { targetUserId },
      impactLevel: ImpactLevel.MEDIUM,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logUserDeactivate(
    adminId: string,
    targetUserId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: 'USER_DEACTIVATE',
      description: `Desativou usuário`,
      content: { targetUserId },
      impactLevel: ImpactLevel.HIGH,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  /**
   * Logs de consultas
   */
  async logAppointmentCreate(
    userId: string,
    appointmentId: string,
    patientId: string,
    doctorId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'APPOINTMENT_CREATE',
      description: 'Criou nova consulta',
      content: { appointmentId, patientId, doctorId },
      impactLevel: ImpactLevel.MEDIUM,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logAppointmentUpdate(
    userId: string,
    appointmentId: string,
    changes: Record<string, unknown>,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'APPOINTMENT_UPDATE',
      description: 'Atualizou consulta',
      content: { appointmentId, changes },
      impactLevel: ImpactLevel.MEDIUM,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logAppointmentCancel(
    userId: string,
    appointmentId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'APPOINTMENT_CANCEL',
      description: 'Cancelou consulta',
      content: { appointmentId },
      impactLevel: ImpactLevel.HIGH,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logAppointmentComplete(
    userId: string,
    appointmentId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'APPOINTMENT_COMPLETE',
      description: 'Completou consulta',
      content: { appointmentId },
      impactLevel: ImpactLevel.MEDIUM,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  /**
   * Logs de prescrições
   */
  async logPrescriptionCreate(
    doctorId: string,
    prescriptionId: string,
    patientId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId: doctorId,
      action: 'PRESCRIPTION_CREATE',
      description: 'Criou prescrição médica',
      content: { prescriptionId, patientId },
      impactLevel: ImpactLevel.HIGH,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logPrescriptionView(
    userId: string,
    prescriptionId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'PRESCRIPTION_VIEW',
      description: 'Visualizou prescrição médica',
      content: { prescriptionId },
      impactLevel: ImpactLevel.LOW,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  /**
   * Logs de UTI
   */
  async logUtiAdmission(
    adminId: string,
    patientId: string,
    utiId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: 'UTI_ADMISSION',
      description: 'Realizou admissão de paciente na UTI',
      content: { patientId, utiId },
      impactLevel: ImpactLevel.CRITICAL,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logUtiDischarge(
    adminId: string,
    patientId: string,
    utiId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: 'UTI_DISCHARGE',
      description: 'Realizou alta de paciente da UTI',
      content: { patientId, utiId },
      impactLevel: ImpactLevel.CRITICAL,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  /**
   * Logs de solicitações
   */
  async logRequestCreate(
    userId: string,
    requestId: string,
    type: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'REQUEST_CREATE',
      description: `Criou solicitação do tipo ${type}`,
      content: { requestId, type },
      impactLevel: ImpactLevel.MEDIUM,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logRequestApprove(
    userId: string,
    requestId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'REQUEST_APPROVE',
      description: 'Aprovou solicitação',
      content: { requestId },
      impactLevel: ImpactLevel.HIGH,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logRequestReject(
    userId: string,
    requestId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'REQUEST_REJECT',
      description: 'Rejeitou solicitação',
      content: { requestId },
      impactLevel: ImpactLevel.HIGH,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  /**
   * Logs de dados médicos
   */
  async logPatientDataAccess(
    userId: string,
    patientId: string,
    dataType: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'PATIENT_DATA_ACCESS',
      description: `Acessou dados do paciente: ${dataType}`,
      content: { patientId, dataType },
      impactLevel: ImpactLevel.MEDIUM,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  async logPatientDataExport(
    userId: string,
    patientId: string,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId,
      action: 'PATIENT_DATA_EXPORT',
      description: 'Exportou dados do paciente',
      content: { patientId },
      impactLevel: ImpactLevel.HIGH,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  /**
   * Logs de configuração do sistema
   */
  async logSystemConfigChange(
    adminId: string,
    configKey: string,
    oldValue: unknown,
    newValue: unknown,
    context: AuditContext
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: 'SYSTEM_CONFIG_CHANGE',
      description: `Alterou configuração do sistema: ${configKey}`,
      content: { configKey, oldValue, newValue },
      impactLevel: ImpactLevel.CRITICAL,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  /**
   * Busca logs com filtros
   */
  async getLogs(filters: {
    userId?: string
    action?: string
    impactLevel?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }) {
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    if (filters.userId) {
      return await auditLogRepository.findByUserId(
        filters.userId,
        limit,
        offset
      )
    }

    if (filters.action) {
      return await auditLogRepository.findByAction(filters.action, limit, offset)
    }

    if (filters.impactLevel) {
      return await auditLogRepository.findByImpactLevel(
        filters.impactLevel,
        limit,
        offset
      )
    }

    if (filters.startDate && filters.endDate) {
      return await auditLogRepository.findByDateRange(
        filters.startDate,
        filters.endDate,
        limit,
        offset
      )
    }

    return await auditLogRepository.findAll(limit, offset)
  }

  /**
   * Conta logs com filtros
   */
  async countLogs(filters: {
    userId?: string
    action?: string
    impactLevel?: string
    startDate?: Date
    endDate?: Date
  }): Promise<number> {
    return await auditLogRepository.count(filters)
  }
}

export const auditService = new AuditService()
