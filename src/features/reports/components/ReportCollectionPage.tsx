import { useReportStore } from '../reportStore';
import type { EpisodeBill } from '../bill';

interface ReportCollectionPageProps {
  onBack: () => void;
  onOpenReport: () => void;
}

export function ReportCollectionPage({ onBack, onOpenReport }: ReportCollectionPageProps) {
  const { reports, setCurrentReport } = useReportStore();

  return (
    <div style={{ padding: 24, maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#ffeb3b', margin: 0 }}>Battle Reports</h2>
        <button onClick={onBack} style={backBtnStyle}>Back</button>
      </div>

      {reports.length === 0 && (
        <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>
          No reports yet. Complete a battle to see reports here.
        </div>
      )}

      {reports.map((r) => (
        <div
          key={r.reportId}
          onClick={() => { setCurrentReport(r, (r as { bill?: EpisodeBill }).bill ?? { battleId: r.battleId, lineItems: [], totalIncome: 0, totalExpense: 0, netGold: 0 }); onOpenReport(); }}
          style={{
            padding: 12,
            marginBottom: 8,
            background: '#1a1a2e',
            borderRadius: 8,
            cursor: 'pointer',
            border: '1px solid #333',
          }}
        >
          <div style={{ color: '#eee', fontWeight: 'bold', marginBottom: 4 }}>{r.title}</div>
          <div style={{ color: '#888', fontSize: 12 }}>{r.summary}</div>
          <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>
            {new Date(r.createdAt).toLocaleString()} | {r.totalActions} actions
          </div>
        </div>
      ))}
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: 4,
  border: 'none',
  background: '#333',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 12,
};
