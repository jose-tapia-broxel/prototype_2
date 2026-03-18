import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface KpiCard {
  name: string;
  value: string;
  trend: string;
  insight: string;
}

interface FunnelStep {
  stage: string;
  conversion: number;
  medianHours: number;
  topDropOff: string;
}

interface Recommendation {
  insight: string;
  probableCause: string;
  action: string;
  impact: string;
  rice: number;
}

@Component({
  selector: 'app-business-insights',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './business-insights.component.html',
  styleUrl: './business-insights.component.css'
})
export class BusinessInsightsComponent {
  readonly kpis: KpiCard[] = [
    {
      name: 'Activation Rate (7d)',
      value: '58%',
      trend: '+4.2 pp vs last month',
      insight: 'Onboarding improvements are increasing early value realization.'
    },
    {
      name: 'Time to First Value',
      value: '2.1 days',
      trend: '-0.6 days',
      insight: 'Users are finding first success faster, reducing churn risk.'
    },
    {
      name: 'Trial → Paid Conversion',
      value: '21%',
      trend: '+1.8 pp',
      insight: 'Mid-market cohorts show the strongest monetization momentum.'
    },
    {
      name: 'Week 4 Retention',
      value: '69%',
      trend: '-2.1 pp',
      insight: 'Retention dip appears in high-complexity implementation cohorts.'
    }
  ];

  readonly acquisitionToValue: FunnelStep[] = [
    { stage: 'Account Created', conversion: 100, medianHours: 0.1, topDropOff: 'Low intent leads' },
    { stage: 'Onboarding Started', conversion: 83, medianHours: 2.4, topDropOff: 'Delayed first login' },
    { stage: 'Onboarding Completed', conversion: 64, medianHours: 18.1, topDropOff: 'Too many required fields' },
    { stage: 'First Value Reached', conversion: 58, medianHours: 50.4, topDropOff: 'Validation latency' },
    { stage: 'Recurring Use (7d)', conversion: 45, medianHours: 120.0, topDropOff: 'No habit loop reminders' }
  ];

  readonly valueToMonetization: FunnelStep[] = [
    { stage: 'Active with Value', conversion: 100, medianHours: 0.2, topDropOff: 'N/A' },
    { stage: 'Uses Monetizable Feature', conversion: 72, medianHours: 12.3, topDropOff: 'Discoverability of premium capabilities' },
    { stage: 'Upgrade Intent', conversion: 39, medianHours: 31.8, topDropOff: 'ROI not explicit' },
    { stage: 'Payment Success', conversion: 31, medianHours: 2.2, topDropOff: 'Checkout friction on enterprise approvals' },
    { stage: 'Renewal / Expansion', conversion: 24, medianHours: 220.0, topDropOff: 'Value story not renewed proactively' }
  ];

  readonly frictionSignals: string[] = [
    'Repeated retries on the same key step in a single session.',
    'P90 step time increases >20% versus baseline by segment.',
    'Backtracking between two steps more than 2 times.',
    'Error + abandonment sequence in less than 3 minutes.',
    'Support ticket opened within 24h after a critical workflow drop.'
  ];

  readonly recommendations: Recommendation[] = [
    {
      insight: 'Enterprise setup step conversion dropped 18% WoW.',
      probableCause: 'Complex approval fields plus delayed validation responses.',
      action: 'Introduce progressive disclosure, draft save and validation preview state.',
      impact: '+8% setup completion and +2.5 pp paid conversion.',
      rice: 320
    },
    {
      insight: 'Trial users hesitate before upgrade after feature usage.',
      probableCause: 'Value narrative is not translated into monetary outcomes.',
      action: 'Add contextual ROI panel and benchmark outcomes before checkout.',
      impact: '+6% upgrade intent and +1.9 pp checkout conversion.',
      rice: 280
    },
    {
      insight: 'Week 4 retention declines in low-touch segments.',
      probableCause: 'No guided habit loop after first value.',
      action: 'Launch lifecycle nudges tied to success milestones and expansion prompts.',
      impact: '+4 pp week-4 retention and lower churn risk index.',
      rice: 260
    }
  ];

  readonly dataOverloadRules: string[] = [
    'Executive layer keeps only 5-7 KPIs with owner and decision attached.',
    'Squad layer limits to 10-15 operational metrics by journey.',
    'Unused metrics are sunset after 30-60 days.',
    'All views prioritize trend and benchmark over isolated absolute values.',
    'Default dashboard follows overview first and drill-down on anomaly only.'
  ];
}
