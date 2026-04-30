import { create } from 'zustand';
import type { BattleReport } from './finalReport';
import type { EpisodeBill } from './bill';

const STORAGE_KEY = 'zog_reports';

function loadReports(): BattleReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveReports(reports: BattleReport[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch { /* ignore */ }
}

interface ReportStore {
  reports: BattleReport[];
  currentReport: BattleReport | null;
  currentBill: EpisodeBill | null;

  setCurrentReport: (report: BattleReport, bill: EpisodeBill) => void;
  addReport: (report: BattleReport) => void;
  updateReport: (report: BattleReport) => void;
  clearCurrent: () => void;
}

export const useReportStore = create<ReportStore>((set) => ({
  reports: loadReports(),
  currentReport: null,
  currentBill: null,

  setCurrentReport: (report, bill) => set({ currentReport: report, currentBill: bill }),

  addReport: (report) =>
    set((s) => {
      const next = [report, ...s.reports].slice(0, 20);
      saveReports(next);
      return { reports: next };
    }),

  updateReport: (report) =>
    set((s) => {
      const next = s.reports.map((r) => r.battleId === report.battleId ? report : r);
      saveReports(next);
      return { reports: next };
    }),

  clearCurrent: () => set({ currentReport: null, currentBill: null }),
}));
