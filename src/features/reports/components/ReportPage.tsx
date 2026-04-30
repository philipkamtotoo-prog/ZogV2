import { useReportStore } from '../reportStore';

interface ReportPageProps {
  onBack: () => void;
}

export function ReportPage({ onBack }: ReportPageProps) {
  const { currentReport, currentBill } = useReportStore();

  if (!currentReport) {
    return <div style={{ color: '#888', padding: 20 }}>No report available.</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#ffeb3b', margin: 0 }}>{currentReport.title}</h2>
        <button onClick={onBack} style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: '#333', color: '#aaa', cursor: 'pointer', fontSize: 12 }}>Back to Reports</button>
      </div>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>{currentReport.summary}</p>

      <Section title="排名">
        {currentReport.rankings.map((s) => (
          <div key={s.actorId} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#ccc', fontSize: 13 }}>
            <span>
              #{s.rank} {s.name}
              {s.isWinner && <Tag color="#ffeb3b">W</Tag>}
              {s.isMVP && <Tag color="#ff9800">MVP</Tag>}
            </span>
            <span style={{ fontWeight: 'bold' }}>{s.finalScore}</span>
          </div>
        ))}
      </Section>

      {currentReport.eliminationOrder.length > 0 && (
        <Section title="淘汰顺序">
          {currentReport.eliminationOrder.map((e, i) => (
            <div key={e.actorId} style={{ color: '#f44336', fontSize: 12, padding: '1px 0' }}>
              {i + 1}. {e.name} — 第{e.atAction}回合
            </div>
          ))}
        </Section>
      )}

      <Section title="高光台词">
        <div style={{ color: '#ce93d8', fontStyle: 'italic', fontSize: 14 }}>
          "{currentReport.highlightDialogue}"
        </div>
      </Section>

      <Section title="最大事故">
        <div style={{ color: '#ff9800', fontSize: 13 }}>{currentReport.biggestIncident}</div>
      </Section>

      {currentReport.playerCommands.length > 0 && (
        <Section title="玩家指令记录">
          {currentReport.playerCommands.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: '#aaa', padding: '1px 0' }}>
              "{c.input}" → <span style={{ color: c.status === 'REJECTED' ? '#f44336' : '#4caf50' }}>{c.status}</span>
            </div>
          ))}
        </Section>
      )}

      <Section title="Zog 反应">
        <div style={{ color: '#81c784', fontSize: 14 }}>{currentReport.zogReaction}</div>
      </Section>

      {currentBill && (
        <Section title="节目账单">
          {currentBill.lineItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 12 }}>
              <span style={{ color: '#ccc' }}>{item.label}</span>
              <span style={{ color: item.type === 'INCOME' ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                {item.type === 'INCOME' ? '+' : '-'}{item.amount}G
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #444', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span style={{ color: '#eee' }}>净收益</span>
            <span style={{ color: currentBill.netGold >= 0 ? '#4caf50' : '#f44336' }}>
              {currentBill.netGold >= 0 ? '+' : ''}{currentBill.netGold}G
            </span>
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: '#88ccff', fontSize: 12, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ color, fontSize: 10, marginLeft: 4, fontWeight: 'bold' }}>{children}</span>
  );
}
