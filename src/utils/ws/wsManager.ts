import { ExchangeConfigMap, ExchangeType } from '@/config/exchangeConfig';
import { prefetchOpenPrices } from './sodUtc8';

// ============ 类型定义 ============
export interface WsManagerConfig {
  maxRetries?: number; // 最大重试次数，默认 5
  baseDelay?: number; // 基础延迟（毫秒），默认 1000
  maxDelay?: number; // 最大延迟（毫秒），默认 30000
}

export type MessageHandler = (data: any) => void;
export type ConnectionHandler = () => void;

// ============ 默认配置 ============
const DEFAULT_CONFIG: Required<WsManagerConfig> = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000
};

/**
 * WebSocket 管理器
 * - 自动重连（指数退避）
 * - 连接状态管理
 * - 消息回调处理
 */
class WsManager {
  private ws: WebSocket | null = null;
  private config: Required<WsManagerConfig>;

  // 重试相关状态
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  // 是否手动断开连接
  private isManualDisconnect = false;

  // 当前连接信息（用于重连）
  private currentExchange: ExchangeType | null = null;
  private currentTokenList: string[] = [];

  private lastMessageAt = Date.now();
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;

  // 回调函数
  private messageHandler: MessageHandler | null = null;
  private openHandler: ConnectionHandler | null = null;
  private closeHandler: ConnectionHandler | null = null;
  private errorHandler: ConnectionHandler | null = null;

  constructor(config: WsManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 建立 WebSocket 连接
   * @param exchange 交易所类型
   * @param tokenList 币种列表
   */
  async connect(exchange: ExchangeType, tokenList: string[]): Promise<void> {
    // 先断开旧连接（标记为主动断开，不触发重试）
    this.disconnect();

    // 重置状态
    this.isManualDisconnect = false;
    this.currentExchange = exchange;
    this.currentTokenList = tokenList;

    const config = ExchangeConfigMap[exchange];
    if (!config) {
      console.warn(`[WsManager] 未知的交易所: ${exchange}`);
      return;
    }

    // 预取开盘价（Gate 和 BN 需要从 REST API 获取）
    try {
      await prefetchOpenPrices(exchange, tokenList);
    } catch (err) {
      console.log('[WsManager] 预取开盘价失败:', err);
    }

    // 创建 WebSocket 连接
    console.log(`[WsManager] 正在连接 ${exchange}...`);
    this.ws = new WebSocket(config.wsUrl);

    this.ws.onopen = () => {
      console.log(`[WsManager] 连接成功: ${exchange}`);

      // 连接成功，重置重试计数
      this.resetRetryState();

      this.lastMessageAt = Date.now();
      this.startWatchdog();

      // 发送订阅消息
      if (tokenList.length > 0) {
        const msg = config.buildSubscribeMessage(tokenList);
        // this.ws?.send(JSON.stringify(msg));
        if (Array.isArray(msg)) {
          msg.forEach(m => this.ws?.send(JSON.stringify(m)));
        } else {
          this.ws?.send(JSON.stringify(msg));
        }
        console.log(`[WsManager] 已订阅 ${tokenList.length} 个币种`);
      }

      // 触发回调
      this.openHandler?.();
    };

    this.ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        this.lastMessageAt = Date.now(); // ⭐关键
        this.messageHandler?.(data);
      } catch (err) {
        console.warn('[WsManager] 消息解析失败:', err);
      }
    };

    this.ws.onclose = event => {
      console.log(`[WsManager] 连接关闭: code=${event.code}, reason=${event.reason}`);
      this.stopWatchdog();
      this.ws = null;

      // 触发回调
      this.closeHandler?.();

      // 尝试重连
      this.scheduleRetry();
    };

    this.ws.onerror = () => {
      console.warn('[WsManager] 连接错误');
      this.errorHandler?.();
      // onerror 后通常会触发 onclose，重连逻辑在 onclose 中处理
    };
  }

  /**
   * 主动断开连接（不会触发重试）
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.clearRetryTimer();

    if (!this.ws) return;

    const state = this.ws.readyState;

    if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
      console.log('[WsManager] 正在断开连接...');
      this.ws.onclose = null; // 移除 onclose 处理，防止触发重试
      this.ws.close();
      this.ws = null;
      console.log('[WsManager] 连接已断开');
    } else if (state === WebSocket.CLOSING || state === WebSocket.CLOSED) {
      this.ws = null;
    }
  }

  /**
   * 设置消息处理回调
   */
  onMessage(handler: MessageHandler): this {
    this.messageHandler = handler;
    return this;
  }

  /**
   * 设置连接成功回调
   */
  onOpen(handler: ConnectionHandler): this {
    this.openHandler = handler;
    return this;
  }

  /**
   * 设置连接关闭回调
   */
  onClose(handler: ConnectionHandler): this {
    this.closeHandler = handler;
    return this;
  }

  /**
   * 设置连接错误回调
   */
  onError(handler: ConnectionHandler): this {
    this.errorHandler = handler;
    return this;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 检查是否正在连接中
   */
  isConnecting(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.CONNECTING;
  }

  /**
   * 获取当前重试次数
   */
  getRetryCount(): number {
    return this.retryCount;
  }

  // ============ 私有方法 ============

  /**
   * 计算重试延迟（指数退避）
   * 1s → 2s → 4s → 8s → 16s → 30s (max)
   */
  private getRetryDelay(): number {
    const delay = Math.min(this.config.baseDelay * Math.pow(2, this.retryCount), this.config.maxDelay);
    return delay;
  }

  /**
   * 清除重试定时器
   */
  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * 重置重试状态
   */
  private resetRetryState(): void {
    this.retryCount = 0;
    this.clearRetryTimer();
  }

  /**
   * 调度重试连接
   */
  private scheduleRetry(): void {
    // 主动断开，不重试
    if (this.isManualDisconnect) {
      console.log('[WsManager] 主动断开，不进行重试');
      return;
    }

    // 超过最大重试次数
    if (this.retryCount >= this.config.maxRetries) {
      console.log(`[WsManager] 已达到最大重试次数 (${this.config.maxRetries})，停止重试`);
      return;
    }

    // 没有连接信息，无法重试
    if (!this.currentExchange || !this.currentTokenList.length) {
      console.log('[WsManager] 没有连接信息，无法重试');
      return;
    }

    const delay = this.getRetryDelay();
    this.retryCount++;

    console.log(`[WsManager] 第 ${this.retryCount}/${this.config.maxRetries} 次重试，${delay / 1000}秒后执行...`);

    this.clearRetryTimer();
    this.retryTimer = setTimeout(() => {
      console.log(`[WsManager] 开始第 ${this.retryCount} 次重连...`);
      this.isManualDisconnect = false; // 确保重连时允许后续重试
      this.connect(this.currentExchange!, this.currentTokenList);
    }, delay);
  }

  /**
   * 启动心跳检测
   */
  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const now = Date.now();
      if (now - this.lastMessageAt > 8000) {
        console.warn('[WsManager] 心跳超时，触发重连');
        this.forceReconnect('watchdog-timeout');
      }
    }, 3000);
  }

  /**
   * 停止心跳检测
   */
  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  /**
   * 强制重连
   */
  private forceReconnect(reason: string) {
    if (this.isConnecting()) return;
    console.log('[WsManager] forceReconnect:', reason);
    this.isManualDisconnect = false;
    this.ws?.close();
  }
}

// 导出单例实例
export const wsManager = new WsManager();

// 也导出类，方便需要多实例的场景
export { WsManager };
