/**
 * reporterMemoryMapper - ReporterMemoryEntry -> DisplayEvent
 * 将记者记忆（ReporterMemory）映射为表现层事件
 */

import type { ReporterMemoryEntry } from '../../features/reports/reporterMemory';
import type { DisplayEvent } from './displayTypes';

export function mapReporterMemoryToDisplayEvents(memories: ReporterMemoryEntry[]): DisplayEvent[] {
  return memories.map((mem): DisplayEvent => ({
    kind: 'REPORTER',
    eventId: mem.memoryId,
    actorActionIndex: mem.actorActionIndex,
    content: mem.text,
    memoryType: mem.type,
    severity: mem.severity,
  }));
}
