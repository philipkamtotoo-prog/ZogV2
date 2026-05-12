/**
 * 功能备注：战斗页 UI 状态 hook。
 * 集中管理下方 Tab、右侧浮层、道具选中、战地记者未读和本局记者卡片列表。
 */
import { useEffect, useState } from 'react';
import type { ItemId } from '../../../core/economy/items';
import { reportFingerprint } from './battleDisplayUtils';
import type { BattleLogTab, BattleOverlay, ReporterReportCard } from './battleUiTypes';

interface LiveReportLike {
  headline?: string;
  summary?: string;
  createdAtActionIndex?: number;
}

interface UseBattlePageUiStateArgs {
  actorActionIndex?: number;
  battleId?: string;
  liveReport: LiveReportLike | null | undefined;
}

export function useBattlePageUiState({ actorActionIndex, battleId, liveReport }: UseBattlePageUiStateArgs) {
  const [activeTab, setActiveTab] = useState<BattleLogTab>('log');
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);
  const [openReporterId, setOpenReporterId] = useState<string | null>(null);
  const [reporterReports, setReporterReports] = useState<ReporterReportCard[]>([]);
  const [activeOverlay, setActiveOverlay] = useState<BattleOverlay>(null);
  const [hasUnreadReporter, setHasUnreadReporter] = useState(false);

  useEffect(() => {
    if (!liveReport || (!liveReport.headline && !liveReport.summary)) return;

    const actionIndex = liveReport.createdAtActionIndex ?? actorActionIndex ?? 0;
    const fingerprint = reportFingerprint(liveReport.headline ?? '', liveReport.summary ?? '');
    const id = `live-${fingerprint}`;
    const reportAlreadySeen = reporterReports.some((report) => reportFingerprint(report.title, report.content) === fingerprint);
    if (!reportAlreadySeen && activeTab !== 'reporter') setHasUnreadReporter(true);
    setReporterReports((current) => {
      if (current.some((report) => reportFingerprint(report.title, report.content) === fingerprint)) return current;
      return [
        {
          id,
          title: liveReport.headline || '战地记者报道',
          content: liveReport.summary || '记者还在组织语言。',
          actionIndex,
        },
        ...current,
      ].slice(0, 24);
    });
  }, [activeTab, actorActionIndex, liveReport, reporterReports]);

  useEffect(() => {
    setReporterReports([]);
    setOpenReporterId(null);
    setHasUnreadReporter(false);
  }, [battleId]);

  const selectLogTab = (tab: BattleLogTab) => {
    setActiveTab(tab);
    if (tab === 'reporter') setHasUnreadReporter(false);
  };

  return {
    activeOverlay,
    activeTab,
    hasUnreadReporter,
    openReporterId,
    reporterReports,
    selectedItemId,
    selectLogTab,
    setActiveOverlay,
    setOpenReporterId,
    setSelectedItemId,
  };
}
