import { useState } from 'react';
import { useBattleStore } from './features/battle/battleStore';
import { BattlePage } from './features/battle/components/BattlePage';
import { BettingPage } from './features/battle/components/BettingPage';
import { ResultsPage } from './features/battle/components/ResultsPage';
import { LoungePage } from './features/lounge/components/LoungePage';
import { ShopPage } from './features/shop/components/ShopPage';
import { RosterPage } from './features/actors/components/RosterPage';
import { ReportCollectionPage } from './features/reports/components/ReportCollectionPage';
import { ReportPage } from './features/reports/components/ReportPage';
import { useReportStore } from './features/reports/reportStore';

type AppView = 'LOUNGE' | 'BETTING' | 'BATTLE' | 'RESULTS' | 'SHOP' | 'ROSTER' | 'REPORTS' | 'REPORT_DETAIL';

function App() {
  const battleView = useBattleStore((s) => s.view);
  const currentReport = useReportStore((s) => s.currentReport);
  const [loungeView, setLoungeView] = useState<AppView>('LOUNGE');

  const resolvedView: AppView =
    battleView === 'BETTING' ? 'BETTING' :
    battleView === 'BATTLE' ? 'BATTLE' :
    battleView === 'RESULTS' ? 'RESULTS' :
    currentReport && loungeView === 'REPORT_DETAIL' ? 'REPORT_DETAIL' :
    loungeView;

  return (
    <div style={{ background: '#0f0f23', color: '#eee', minHeight: '100vh', fontFamily: 'monospace' }}>
      {resolvedView === 'LOUNGE' && (
        <LoungePage
          onEnterTV={() => useBattleStore.getState().initBattle()}
          onOpenShop={() => setLoungeView('SHOP')}
          onOpenReports={() => setLoungeView('REPORTS')}
          onOpenRoster={() => setLoungeView('ROSTER')}
        />
      )}
      {resolvedView === 'BETTING' && <BettingPage />}
      {resolvedView === 'BATTLE' && <BattlePage />}
      {resolvedView === 'RESULTS' && <ResultsPage />}
      {resolvedView === 'SHOP' && <ShopPage onBack={() => setLoungeView('LOUNGE')} />}
      {resolvedView === 'ROSTER' && <RosterPage onBack={() => setLoungeView('LOUNGE')} />}
      {resolvedView === 'REPORTS' && (
        <ReportCollectionPage
          onBack={() => setLoungeView('LOUNGE')}
          onOpenReport={() => setLoungeView('REPORT_DETAIL')}
        />
      )}
      {resolvedView === 'REPORT_DETAIL' && <ReportPage onBack={() => setLoungeView('REPORTS')} />}
    </div>
  );
}

export default App;
