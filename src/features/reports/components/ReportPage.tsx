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
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#ffeb3b', margin: 0 }}>{currentReport.title}</h2>
        <button onClick={onBack} style={backBtnStyle}>Back</button>
      </div>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>{currentReport.summary}</p>

      <Section title="Ranking">
        {currentReport.rankings.map((s) => (
          <div key={s.actorId} style={rowStyle}>
            <span>
              #{s.rank} {s.name}
              {s.isWinner && <Tag color="#ffeb3b">W</Tag>}
              {s.isMVP && <Tag color="#ff9800">MVP</Tag>}
            </span>
            <span>{s.finalScore}</span>
          </div>
        ))}
      </Section>

      <Section title="Highlight">
        <div style={{ color: '#ce93d8', fontStyle: 'italic', fontSize: 14 }}>
          "{currentReport.highlightDialogue}"
        </div>
      </Section>

      <Section title="Biggest Incident">
        <div style={{ color: '#ff9800', fontSize: 13 }}>{currentReport.biggestIncident}</div>
      </Section>

      {currentReport.reporterMemory && currentReport.reporterMemory.length > 0 && (
        <Section title="Program Memory">
          {currentReport.reporterMemory
            .slice()
            .sort((a, b) => b.severity - a.severity || a.actorActionIndex - b.actorActionIndex)
            .slice(0, 12)
            .map((memory) => (
              <div key={memory.memoryId} style={{ fontSize: 12, color: '#ccc', padding: '3px 0' }}>
                <span style={{ color: '#ffcc80' }}>#{memory.actorActionIndex} [{memory.type}]</span>{' '}
                <b>{memory.title}</b>
                <div style={{ color: '#999', marginTop: 1 }}>{memory.text}</div>
              </div>
            ))}
        </Section>
      )}

      {currentReport.playerCommands.length > 0 && (
        <Section title="Player Interventions">
          {currentReport.playerCommands.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: '#aaa', padding: '1px 0' }}>
              "{c.input}" {'->'} <span style={{ color: c.status === 'REJECTED' ? '#f44336' : '#4caf50' }}>{c.status}</span>
            </div>
          ))}
        </Section>
      )}

      {currentReport.stageBriefs.length > 0 && (
        <Section title="Stage Briefs">
          {currentReport.stageBriefs.map((brief) => (
            <div key={brief.briefId} style={{ fontSize: 12, color: '#aaa', padding: '1px 0' }}>
              #{brief.actorActionIndex}: {brief.text}
            </div>
          ))}
        </Section>
      )}

      {currentReport.salaryAwards.length > 0 && (
        <Section title="Actor Salary">
          {currentReport.salaryAwards.map((award) => (
            <div key={award.actorId} style={rowStyle}>
              <span>{award.name} #{award.rank}</span>
              <span>{award.rankSalary}S + {award.mvpBonus}S MVP = {award.totalSalary}S</span>
            </div>
          ))}
        </Section>
      )}

      {currentReport.shameRecords.length > 0 && (
        <Section title="Shame Records">
          {currentReport.shameRecords.map((record) => (
            <div key={`${record.actorId}_${record.reason}`} style={{ fontSize: 12, color: '#ffab91', padding: '1px 0' }}>
              {record.name}: {record.reason}
            </div>
          ))}
        </Section>
      )}

      {currentReport.mutationName && (
        <Section title="Mutation">
          <div style={{ color: '#81c784', fontSize: 13 }}>{currentReport.mutationName}</div>
        </Section>
      )}

      {currentReport.promptInjections.length > 0 && (
        <Section title="Prompt Injections">
          {currentReport.promptInjections.map((injection) => (
            <div key={injection.actorId} style={{ fontSize: 12, color: '#aaa', padding: '1px 0' }}>
              {injection.actorName}: {injection.prompt}
            </div>
          ))}
        </Section>
      )}

      <Section title="Zog Reaction">
        <div style={{ color: '#81c784', fontSize: 14 }}>{currentReport.zogReaction}</div>
      </Section>

      {currentBill && (
        <Section title="Episode Bill">
          {currentBill.lineItems.map((item, i) => (
            <div key={i} style={rowStyle}>
              <span>{item.label}</span>
              <span style={{ color: item.type === 'INCOME' ? '#4caf50' : '#f44336' }}>
                {item.type === 'INCOME' ? '+' : '-'}{item.amount}G
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #444', marginTop: 8, paddingTop: 8, ...rowStyle }}>
            <span>Net</span>
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
  return <span style={{ color, fontSize: 10, marginLeft: 4, fontWeight: 'bold' }}>{children}</span>;
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '2px 0',
  color: '#ccc',
  fontSize: 13,
  gap: 12,
};

const backBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  borderRadius: 4,
  border: 'none',
  background: '#333',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 12,
};
