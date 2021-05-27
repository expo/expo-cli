import { EventEmitter } from 'events';

type StatusEvent =
  | { type: 'bundleBuildFinish'; totalBuildTimeMs: number }
  | { type: 'deviceLogReceive'; deviceId: string; deviceName: string };
type StatusEventFields<T> = Omit<T, 'type'>;

declare interface StatusEventEmitter {
  addListener<T extends StatusEvent>(
    event: StatusEvent['type'],
    listener: (fields: StatusEventFields<T>) => void
  ): this;
  once<T extends StatusEvent>(
    event: StatusEvent['type'],
    listener: (fields: StatusEventFields<T>) => void
  ): this;
  removeListener<T extends StatusEvent>(
    event: StatusEvent['type'],
    listener: (fields: StatusEventFields<T>) => void
  ): this;
  emit<T extends StatusEvent>(event: T['type'], fields: StatusEventFields<T>): boolean;
}

class StatusEventEmitter extends EventEmitter {}

export default new StatusEventEmitter();
