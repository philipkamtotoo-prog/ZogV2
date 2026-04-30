import { useBattleStore } from '../battleStore';
import { useReportStore } from '../../reports/reportStore';
import { extractBattleReport } from '../../reports/finalReport';
import { generateLLMReport } from '../../reports/reportGenerator';
import { calculateEpisodeBill } from '../../reports/bill';
import { useLoungeStore } from '../../lounge/loungeStore';
import { loadStoredLLMConfig, validateLLMConfig } from '../../../llm/clients/byokConfig';
import { useEffect, useRef } from 'react';
import { calculateSalaryAwards } from '../../../core/battle/finalScore';

export function ResultsPage() {
  const { finalScores, battleState, goToLobby, betSlip, getBetPayout } = useBattleStore();
  const { setCurrentReport, addReport, updateReport, currentBill } = useReportStore();
  const addGold = useLoungeStore((s) => s.addGold);
  const addActorSalary = useLoungeStore((s) => s.addActorSalary);
  const generated = useRef(false);

  const payout = getBetPayout();

  useEffect(() => {
    if (battleState && finalScores.length > 0 && !generated.current) {
      generated.current = true;

      const bill = calculateEpisodeBill(
        battleState,
        finalScores,
        betSlip?.locked ? betSlip : null,
        battleState.usedItemIds.length
      );
      const totalGold = bill.netGold;
      const salaryAwards = battleState.salaryAwards.length > 0
        ? battleState.salaryAwards
        : calculateSalaryAwards(finalScores);

      const baseReport = extractBattleReport(battleState, bill, battleState.reporterMemory);
      setCurrentReport(baseReport, bill);
      addReport(baseReport);
      addGold(totalGold);
      salaryAwards.forEach((award) => addActorSalary(award.actorId, award.totalSalary));

      const llmConfig = loadStoredLLMConfig();
      if (llmConfig && validateLLMConfig(llmConfig).valid) {
        generateLLMReport(battleState, finalScores, llmConfig)
          .then((llmReport) => {
            const enrichedReport = {
              ...llmReport,
              bill,
              reporterMemory: battleState.reporterMemory,
            };
            setCurrentReport(enrichedReport, bill);
            updateReport(enrichedReport);
          })
          .catch(() => { /* fallback already set */ });
      }
    }
  }, [battleState, finalScores, setCurrentReport, addReport, addGold, addActorSalary, betSlip, payout]);

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ color: '#ffeb3b', marginBottom: 16 }}>战斗结果</h2>

      {battleState && (
        <div style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>
          总行动: {battleState.actorActionIndex} | 事件: {battleState.eventLog.length}
        </div>
      )}

      {betSlip?.locked && (
        <div style={{
          padding: 12, borderRadius: 6, marginBottom: 16,
          background: payout > 0 ? '#1a3a1a' : '#3a1a1a',
          border: `1px solid ${payout > 0 ? '#4caf50' : '#f44336'}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: payout > 0 ? '#4caf50' : '#f44336', marginBottom: 4 }}>
            {payout > 0 ? '押注成功！' : '押注失败'}
          </div>
          <div style={{ fontSize: 12, color: '#ccc' }}>
            押注: {battleState?.actors.find((a) => a.actorId === betSlip.actorId)?.name} |
            下注: {betSlip.amount}G |
            赔率: x{betSlip.odds.toFixed(1)} |
            {payout > 0
              ? <span style={{ color: '#4caf50' }}> 赢得 +{payout}G</span>
              : <span style={{ color: '#f44336' }}> 损失 -{betSlip.amount}G</span>
            }
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #444', color: '#888', fontSize: 12 }}>
            <th style={{ textAlign: 'left', padding: 6 }}>排名</th>
            <th style={{ textAlign: 'left', padding: 6 }}>演员</th>
            <th style={{ textAlign: 'right', padding: 6 }}>得分</th>
            <th style={{ textAlign: 'right', padding: 6 }}>伤害</th>
            <th style={{ textAlign: 'right', padding: 6 }}>击杀</th>
            <th style={{ textAlign: 'center', padding: 6 }}>状态</th>
          </tr>
        </thead>
        <tbody>
          {finalScores.map((s) => (
            <tr key={s.actorId} style={{ borderBottom: '1px solid #333', color: '#ccc' }}>
              <td style={{ padding: 6 }}>
                #{s.rank}
                {s.isWinner && <span style={{ color: '#ffeb3b', marginLeft: 4 }}>W</span>}
                {s.isMVP && <span style={{ color: '#ff9800', marginLeft: 4 }}>MVP</span>}
              </td>
              <td style={{ padding: 6 }}>{s.name}</td>
              <td style={{ padding: 6, textAlign: 'right', fontWeight: 'bold' }}>{s.finalScore}</td>
              <td style={{ padding: 6, textAlign: 'right', fontSize: 12 }}>{s.breakdown.totalDamageDealt.toFixed(0)}</td>
              <td style={{ padding: 6, textAlign: 'right', fontSize: 12 }}>{s.salaryAward}S</td>
              <td style={{ padding: 6, textAlign: 'center', fontSize: 12 }}>
                {s.rank <= battleState!.actors.filter((a) => a.isAlive).length ? (
                  <span style={{ color: '#4caf50' }}>存活</span>
                ) : (
                  <span style={{ color: '#f44336' }}>淘汰</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {currentBill && (
        <div style={{ marginTop: 16, padding: 12, background: '#1a1a2e', borderRadius: 8 }}>
          <div style={{ color: '#88ccff', fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>收支明细</div>
          {currentBill.lineItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
              <span style={{ color: '#ccc' }}>{item.label}</span>
              <span style={{ color: item.type === 'INCOME' ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                {item.type === 'INCOME' ? '+' : '-'}{item.amount}G
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #444', marginTop: 8, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 13 }}>
            <span style={{ color: '#eee' }}>合计</span>
            <span style={{ color: currentBill.netGold >= 0 ? '#4caf50' : '#f44336' }}>
              {currentBill.netGold >= 0 ? '+' : ''}{currentBill.netGold}G
            </span>
          </div>
        </div>
      )}

      <button
        onClick={goToLobby}
        style={{
          marginTop: 24,
          padding: '10px 32px',
          borderRadius: 4,
          border: 'none',
          background: '#2196f3',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        返回客厅
      </button>
    </div>
  );
}
