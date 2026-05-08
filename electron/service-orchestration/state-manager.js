import { serviceStateRepo } from '../database/repositories/service-orchestration/index.js';
import { createLogger } from '../utils/logger.js';
import { SERVICE_STATUS, PROCESS_TYPE } from '../../src/shared/constants/service.ts';

const logger = createLogger('StateManager');

export const SERVICE_STATES = SERVICE_STATUS;
export const PROCESS_TYPES = PROCESS_TYPE;

class ServiceStateManager {
  constructor() {
    this.services = new Map();
    this.stateChangeListeners = new Set();
    this.loadPersistedState();
    setTimeout(async () => {
      try {
        const { getServiceStatus } = await import('./runtime-monitor.js');
        if (this.services.size > 0) {
          logger.info('Verifying services immediately', { count: this.services.size });
          await this.verifyDetachedServices();
        }
      } catch (error) {
        logger.error('Failed to initialize status monitoring', error);
      }
    }, 1000);
  }

  loadPersistedState() {
    try {
      const services = serviceStateRepo.getAll();
      logger.debug('Loading persisted services from database', { count: services.length });
      for (const serviceData of services) {
        this.services.set(serviceData.id, {
          serviceId: serviceData.id,
          name: serviceData.name,
          type: serviceData.type,
          port: serviceData.port,
          endpoint: serviceData.endpoint,
          team: serviceData.team,
          command: serviceData.command,
          processType: serviceData.processType || PROCESS_TYPE.INTERNAL,
          state: SERVICE_STATUS.UNKNOWN,
          lastChecked: null,
          process: null,
          stateHistory: [],
          workingDir: serviceData.workingDir,
          startTime: serviceData.startTime || new Date().toISOString(),
          pid: null,
        });
      }
    } catch (error) {
      logger.error('Failed to load persisted state from database', error);
    }
  }

  savePersistedState() {
    try {
      for (const [serviceId, serviceInfo] of this.services.entries()) {
        serviceStateRepo.save(serviceId, {
          name: serviceInfo.name,
          type: serviceInfo.type,
          port: serviceInfo.port,
          endpoint: serviceInfo.endpoint,
          team: serviceInfo.team,
          command: serviceInfo.command,
          processType: serviceInfo.processType,
          startTime: serviceInfo.startTime,
          state: serviceInfo.state,
          workingDir: serviceInfo.workingDir,
        });
      }
    } catch (error) {
      logger.error('Failed to persist state to database', error);
    }
  }

  registerService(serviceId, serviceInfo) {
    const existing = this.services.get(serviceId);
    const service = {
      ...serviceInfo,
      serviceId,
      state: serviceInfo.state || SERVICE_STATUS.IDLE,
      startTime: serviceInfo.startTime || new Date().toISOString(),
      lastChecked: new Date().toISOString(),
      processType: serviceInfo.processType || PROCESS_TYPE.INTERNAL,
      process: serviceInfo.process || null,
      pid: serviceInfo.pid || null,
      stateHistory: existing?.stateHistory || [],
      checkCommand: serviceInfo.checkCommand,
      diagnosticMessage: serviceInfo.diagnosticMessage || '',
      detectionMethod: serviceInfo.detectionMethod || null,
      processInfo: { running: false, pid: serviceInfo.pid || null, method: null, checkCommand: serviceInfo.checkCommand || null, lastChecked: new Date().toISOString() },
      portInfo: { listening: false, number: serviceInfo.port || null, checkResult: null },
    };
    this.services.set(serviceId, service);
    this.savePersistedState();
    this.notifyStateChange(serviceId, service);
    return service;
  }

  updateServiceState(serviceId, { state: newState, ...metadata }) {
    if (typeof newState !== 'string') {
      logger.error('updateServiceState: state must be a string', { serviceId, received: typeof newState });
      return null;
    }
    const service = this.services.get(serviceId);
    if (!service) {
      logger.warn('Attempted to update unknown service', { serviceId });
      return null;
    }
    const oldState = service.state;
    service.state = newState;
    service.lastChecked = new Date().toISOString();
    if (!service.stateHistory) service.stateHistory = [];
    service.stateHistory.push({ from: oldState, to: newState, timestamp: service.lastChecked, ...metadata });
    if (service.stateHistory.length > 10) service.stateHistory = service.stateHistory.slice(-10);
    this.savePersistedState();
    this.notifyStateChange(serviceId, service);
    logger.debug('Service state updated', { serviceId, from: oldState, to: newState });
    return service;
  }

  markServiceStarting(serviceId, processInfo = {}) {
    const service = this.updateServiceState(serviceId, {
      state: SERVICE_STATUS.STARTING,
      reason: 'Service startup initiated',
      processType: processInfo.processType,
      pid: processInfo.pid,
    });
    if (service && processInfo.process) {
      service.process = processInfo.process;
      service.pid = processInfo.pid || null;
    }
    return service;
  }

  onStateChange(listener) {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  notifyStateChange(serviceId, service) {
    for (const listener of this.stateChangeListeners) {
      try { listener(serviceId, service); } catch (error) { logger.error('State change listener error', error); }
    }
  }

  getService(serviceId) { return this.services.get(serviceId); }
  getAllServices() { return Array.from(this.services.values()); }
  getServicesByState(state) { return this.getAllServices().filter(s => s.state === state); }
  getRunningServices() { return this.getServicesByState(SERVICE_STATUS.RUNNING); }

  async verifyDetachedServices() {
    const services = Array.from(this.services.values());
    const { getServiceStatus } = await import('./runtime-monitor.js');
    const checks = services.map(async (service) => {
      try {
        const status = await getServiceStatus(service.serviceId, true);
        return { serviceId: service.serviceId, success: true, status };
      } catch (error) {
        logger.error('Failed to verify service', { serviceId: service.serviceId, error: error.message });
        return { serviceId: service.serviceId, success: false };
      }
    });
    await Promise.all(checks);
  }
}

export const serviceStateManager = new ServiceStateManager();
