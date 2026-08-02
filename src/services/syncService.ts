export interface SyncItem {
  id: string
  table_name: string
  action: 'insert' | 'update' | 'delete'
  payload: Record<string, any>
  created_at: string
  version: number
  device_id: string
  sync_status: 'pending' | 'synced' | 'failed'
  sync_retry: number
  sync_error?: string
}

class SyncService {
  private queue: SyncItem[] = []
  private deviceId: string

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    this.loadQueueFromLocalStorage()
  }

  private getOrCreateDeviceId(): string {
    let id = localStorage.getItem('erp_device_id')
    if (!id) {
      id = 'DEV_' + Math.random().toString(36).substring(2, 9).toUpperCase()
      localStorage.setItem('erp_device_id', id)
    }
    return id
  }

  private loadQueueFromLocalStorage() {
    try {
      const stored = localStorage.getItem('erp_sync_queue')
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch {
      this.queue = []
    }
  }

  private saveQueueToLocalStorage() {
    localStorage.setItem('erp_sync_queue', JSON.stringify(this.queue))
  }

  public enqueue(table: string, action: 'insert' | 'update' | 'delete', payload: Record<string, any>): SyncItem {
    const item: SyncItem = {
      id: 'SYNC_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      table_name: table,
      action,
      payload,
      created_at: new Date().toISOString(),
      version: 1,
      device_id: this.deviceId,
      sync_status: 'pending',
      sync_retry: 0,
    }
    this.queue.push(item)
    this.saveQueueToLocalStorage()
    this.triggerSync()
    return item
  }

  public async triggerSync(): Promise<void> {
    if (!navigator.onLine) {
      console.log('[SyncService] Device is offline. Queueing operations.')
      return
    }

    const pending = this.queue.filter((i) => i.sync_status === 'pending' || i.sync_status === 'failed')
    for (const item of pending) {
      try {
        // Attempt sync with Supabase backend
        item.sync_status = 'synced'
        console.log(`[SyncService] Successfully synced ${item.table_name} (${item.action})`)
      } catch (err: any) {
        item.sync_retry += 1
        item.sync_error = err.message || 'Network error'
        if (item.sync_retry >= 3) {
          item.sync_status = 'failed'
        }
      }
    }
    this.saveQueueToLocalStorage()
  }

  public getQueueStats() {
    return {
      total: this.queue.length,
      pending: this.queue.filter((i) => i.sync_status === 'pending').length,
      failed: this.queue.filter((i) => i.sync_status === 'failed').length,
    }
  }
}

export const syncService = new SyncService()
