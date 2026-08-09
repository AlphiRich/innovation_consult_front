/**
 * Election-COS1.0 — route table
 * IC-ECOS-BUILD-2026-V2 §3.2. Mirrors the nav table plus the sub-views
 * absorbed under it (not top-level nav): seat calculator, threshold
 * analyzer, scheduled reports, municipality config, permissions,
 * ppfa-thresholds, gatherings advisory.
 */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './Shell';
import { WarRoomPage } from '@/modules/war-room/WarRoomPage';
import { VotersPage } from '@/modules/voters/VotersPage';
import { WardsPage } from '@/modules/wards/WardsPage';
import { WardDetailPage } from '@/modules/wards/WardDetailPage';
import { FieldDiaryPage } from '@/modules/field-diary/FieldDiaryPage';
import { IncidentsPage } from '@/modules/incidents/IncidentsPage';
import { LogisticsPage } from '@/modules/logistics/LogisticsPage';
import { FinancePage } from '@/modules/finance/FinancePage';
import { AnalyticsPage } from '@/modules/analytics/AnalyticsPage';
import { SeatCalculatorPage } from '@/modules/analytics/SeatCalculatorPage';
import { ThresholdAnalyzerPage } from '@/modules/analytics/ThresholdAnalyzerPage';
import { ScheduledReportsPage } from '@/modules/analytics/ScheduledReportsPage';
import { SettingsPage } from '@/modules/settings/SettingsPage';
import { MunicipalityConfigPage } from '@/modules/settings/MunicipalityConfigPage';
import { PermissionsPage } from '@/modules/settings/PermissionsPage';
import { PPFAThresholdsPage } from '@/modules/settings/PPFAThresholdsPage';
import { DataSubjectRequestsPage } from '@/modules/settings/DataSubjectRequestsPage';
import { GatheringsAdvisoryPage } from '@/modules/knowledge/GatheringsAdvisoryPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/war-room" replace /> },
      { path: 'war-room', element: <WarRoomPage /> },
      { path: 'voters', element: <VotersPage /> },
      { path: 'wards', element: <WardsPage /> },
      { path: 'wards/:wardCode', element: <WardDetailPage /> },
      { path: 'diary', element: <FieldDiaryPage /> },
      { path: 'incidents', element: <IncidentsPage /> },
      { path: 'logistics', element: <LogisticsPage /> },
      { path: 'finance', element: <FinancePage /> },
      {
        path: 'analytics',
        children: [
          { index: true, element: <AnalyticsPage /> },
          { path: 'seat-calculator', element: <SeatCalculatorPage /> },
          { path: 'thresholds', element: <ThresholdAnalyzerPage /> },
          { path: 'scheduled-reports', element: <ScheduledReportsPage /> },
        ],
      },
      {
        path: 'settings',
        children: [
          { index: true, element: <SettingsPage /> },
          { path: 'municipality', element: <MunicipalityConfigPage /> },
          { path: 'permissions', element: <PermissionsPage /> },
          { path: 'ppfa-thresholds', element: <PPFAThresholdsPage /> },
          { path: 'data-requests', element: <DataSubjectRequestsPage /> },
        ],
      },
      { path: 'knowledge/gatherings-advisory', element: <GatheringsAdvisoryPage /> },
    ],
  },
]);
