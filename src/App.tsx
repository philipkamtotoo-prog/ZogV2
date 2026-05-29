import { useState } from 'react';
import { useBattleStore } from './features/battle/battleStore';
import { BattlePage } from './features/battle/components/BattlePage';
import { BettingPage } from './features/battle/components/BettingPage';
import { ResultsPage } from './features/battle/components/ResultsPage';
import { LoungePage } from './features/lounge/components/LoungePage';
import { BackpackPage } from './features/lounge/components/BackpackPage';
import { ShopPage } from './features/shop/components/ShopPage';
import { BrokerOfficePage } from './features/actors/components/BrokerOfficePage';
import { ReportCollectionPage } from './features/reports/components/ReportCollectionPage';
import { ReportPage } from './features/reports/components/ReportPage';
import { SettingsPage } from './features/settings/components/SettingsPage';
import { GachaPanel } from './features/gacha/components/GachaPanel';
import { useReportStore } from './features/reports/reportStore';

type AppView = 'LOUNGE' | 'BACKPACK' | 'BETTING' | 'BATTLE' | 'RESULTS' | 'SHOP' | 'ROSTER' | 'REPORTS' | 'REPORT_DETAIL';

function App() {
  const battleView = useBattleStore((s) => s.view);
  const currentReport = useReportStore((s) => s.currentReport);
  const [loungeView, setLoungeView] = useState<AppView>('LOUNGE');
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isGachaOpen, setIsGachaOpen] = useState(false);

  const resolvedView: AppView =
    battleView === 'BETTING' ? 'BETTING' :
    battleView === 'BATTLE' ? 'BATTLE' :
    battleView === 'RESULTS' ? 'RESULTS' :
    currentReport && loungeView === 'REPORT_DETAIL' ? 'REPORT_DETAIL' :
    loungeView;

  return (
    <div style={{ background: '#050505', color: '#eee', minHeight: '100vh' }}>
      {(resolvedView === 'LOUNGE' || resolvedView === 'BETTING') && (
        <LoungePage
          onEnterTV={() => useBattleStore.getState().initBattle()}
          onOpenBackpack={() => setIsBackpackOpen(true)}
          onOpenShop={() => setIsShopOpen(true)}
          onOpenReports={() => setLoungeView('REPORTS')}
          onOpenRoster={() => setLoungeView('ROSTER')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenGacha={() => setIsGachaOpen(true)}
          shopActive={isShopOpen}
        />
      )}
      {resolvedView === 'BACKPACK' && <BackpackPage onBack={() => setLoungeView('LOUNGE')} />}
      {resolvedView === 'BETTING' && <BettingPage />}
      {resolvedView === 'BATTLE' && <BattlePage onOpenSettings={() => setIsSettingsOpen(true)} />}
      {resolvedView === 'RESULTS' && <ResultsPage />}
      {resolvedView === 'SHOP' && <ShopPage onBack={() => setLoungeView('LOUNGE')} />}
      {resolvedView === 'ROSTER' && <BrokerOfficePage onBack={() => setLoungeView('LOUNGE')} />}
      {resolvedView === 'REPORTS' && (
        <ReportCollectionPage
          onBack={() => setLoungeView('LOUNGE')}
          onOpenReport={() => setLoungeView('REPORT_DETAIL')}
        />
      )}
      {resolvedView === 'REPORT_DETAIL' && <ReportPage onBack={() => setLoungeView('REPORTS')} />}
      {(resolvedView === 'LOUNGE' || resolvedView === 'BETTING') && isBackpackOpen && <BackpackPage onBack={() => setIsBackpackOpen(false)} />}
      {(resolvedView === 'LOUNGE' || resolvedView === 'BETTING') && isShopOpen && <ShopPage onBack={() => setIsShopOpen(false)} />}
      {(resolvedView === 'LOUNGE' || resolvedView === 'BETTING') && isGachaOpen && <GachaPanel onClose={() => setIsGachaOpen(false)} />}
      {isSettingsOpen && <SettingsPage onBack={() => setIsSettingsOpen(false)} />}
    </div>
  );
}

export default App;
