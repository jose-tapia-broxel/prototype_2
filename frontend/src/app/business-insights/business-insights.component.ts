import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../language.service';

interface KpiCard {
  name: { en: string; es: string };
  value: string;
  trend: { en: string; es: string };
  insight: { en: string; es: string };
}

interface FunnelStep {
  stage: { en: string; es: string };
  conversion: number;
  medianHours: number;
  topDropOff: { en: string; es: string };
}

interface Recommendation {
  insight: { en: string; es: string };
  probableCause: { en: string; es: string };
  action: { en: string; es: string };
  impact: { en: string; es: string };
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
  lang = inject(LanguageService);

  readonly kpis: KpiCard[] = [
    {
      name: { en: 'Activation Rate (7d)', es: 'Tasa de activación (7d)' },
      value: '58%',
      trend: { en: '+4.2 pp vs last month', es: '+4.2 pp vs mes anterior' },
      insight: { en: 'Onboarding improvements are increasing early value realization.', es: 'Las mejoras en onboarding están acelerando la obtención de valor inicial.' }
    },
    {
      name: { en: 'Time to First Value', es: 'Tiempo al primer valor' },
      value: '2.1 days',
      trend: { en: '-0.6 days', es: '-0.6 días' },
      insight: { en: 'Users are finding first success faster, reducing churn risk.', es: 'Los usuarios logran su primer éxito más rápido, reduciendo riesgo de churn.' }
    },
    {
      name: { en: 'Trial → Paid Conversion', es: 'Conversión Trial → Pago' },
      value: '21%',
      trend: { en: '+1.8 pp', es: '+1.8 pp' },
      insight: { en: 'Mid-market cohorts show the strongest monetization momentum.', es: 'Las cohortes mid-market muestran mayor momentum de monetización.' }
    },
    {
      name: { en: 'Week 4 Retention', es: 'Retención semana 4' },
      value: '69%',
      trend: { en: '-2.1 pp', es: '-2.1 pp' },
      insight: { en: 'Retention dip appears in high-complexity implementation cohorts.', es: 'La caída de retención aparece en cohortes de implementación compleja.' }
    }
  ];

  readonly acquisitionToValue: FunnelStep[] = [
    { stage: { en: 'Account Created', es: 'Cuenta creada' }, conversion: 100, medianHours: 0.1, topDropOff: { en: 'Low intent leads', es: 'Leads de baja intención' } },
    { stage: { en: 'Onboarding Started', es: 'Onboarding iniciado' }, conversion: 83, medianHours: 2.4, topDropOff: { en: 'Delayed first login', es: 'Primer login demorado' } },
    { stage: { en: 'Onboarding Completed', es: 'Onboarding completado' }, conversion: 64, medianHours: 18.1, topDropOff: { en: 'Too many required fields', es: 'Demasiados campos obligatorios' } },
    { stage: { en: 'First Value Reached', es: 'Primer valor alcanzado' }, conversion: 58, medianHours: 50.4, topDropOff: { en: 'Validation latency', es: 'Latencia de validación' } },
    { stage: { en: 'Recurring Use (7d)', es: 'Uso recurrente (7d)' }, conversion: 45, medianHours: 120.0, topDropOff: { en: 'No habit loop reminders', es: 'Sin recordatorios de hábito' } }
  ];

  readonly valueToMonetization: FunnelStep[] = [
    { stage: { en: 'Active with Value', es: 'Activo con valor' }, conversion: 100, medianHours: 0.2, topDropOff: { en: 'N/A', es: 'N/A' } },
    { stage: { en: 'Uses Monetizable Feature', es: 'Usa funcionalidad monetizable' }, conversion: 72, medianHours: 12.3, topDropOff: { en: 'Discoverability of premium capabilities', es: 'Baja visibilidad de capacidades premium' } },
    { stage: { en: 'Upgrade Intent', es: 'Intención de upgrade' }, conversion: 39, medianHours: 31.8, topDropOff: { en: 'ROI not explicit', es: 'ROI no explícito' } },
    { stage: { en: 'Payment Success', es: 'Pago exitoso' }, conversion: 31, medianHours: 2.2, topDropOff: { en: 'Checkout friction on enterprise approvals', es: 'Fricción en checkout por aprobaciones enterprise' } },
    { stage: { en: 'Renewal / Expansion', es: 'Renovación / Expansión' }, conversion: 24, medianHours: 220.0, topDropOff: { en: 'Value story not renewed proactively', es: 'Narrativa de valor no renovada proactivamente' } }
  ];

  readonly frictionSignals: { en: string; es: string }[] = [
    { en: 'Repeated retries on the same key step in a single session.', es: 'Reintentos repetidos en el mismo paso clave dentro de una sesión.' },
    { en: 'P90 step time increases >20% versus baseline by segment.', es: 'El tiempo p90 del paso sube >20% vs línea base por segmento.' },
    { en: 'Backtracking between two steps more than 2 times.', es: 'Retroceso entre dos pasos más de 2 veces.' },
    { en: 'Error + abandonment sequence in less than 3 minutes.', es: 'Secuencia de error + abandono en menos de 3 minutos.' },
    { en: 'Support ticket opened within 24h after a critical workflow drop.', es: 'Ticket de soporte abierto dentro de 24h tras una caída crítica del flujo.' }
  ];

  readonly recommendations: Recommendation[] = [
    {
      insight: { en: 'Enterprise setup step conversion dropped 18% WoW.', es: 'La conversión del paso de setup enterprise cayó 18% WoW.' },
      probableCause: { en: 'Complex approval fields plus delayed validation responses.', es: 'Campos de aprobación complejos y respuestas de validación tardías.' },
      action: { en: 'Introduce progressive disclosure, draft save and validation preview state.', es: 'Introducir divulgación progresiva, guardado en borrador y vista previa de validación.' },
      impact: { en: '+8% setup completion and +2.5 pp paid conversion.', es: '+8% en finalización de setup y +2.5 pp en conversión a pago.' },
      rice: 320
    },
    {
      insight: { en: 'Trial users hesitate before upgrade after feature usage.', es: 'Usuarios trial dudan antes del upgrade tras usar funcionalidades.' },
      probableCause: { en: 'Value narrative is not translated into monetary outcomes.', es: 'La narrativa de valor no se traduce a resultados monetarios.' },
      action: { en: 'Add contextual ROI panel and benchmark outcomes before checkout.', es: 'Agregar panel contextual de ROI y benchmarks antes del checkout.' },
      impact: { en: '+6% upgrade intent and +1.9 pp checkout conversion.', es: '+6% intención de upgrade y +1.9 pp conversión en checkout.' },
      rice: 280
    },
    {
      insight: { en: 'Week 4 retention declines in low-touch segments.', es: 'La retención semana 4 cae en segmentos low-touch.' },
      probableCause: { en: 'No guided habit loop after first value.', es: 'No hay ciclo de hábito guiado tras el primer valor.' },
      action: { en: 'Launch lifecycle nudges tied to success milestones and expansion prompts.', es: 'Lanzar nudges de lifecycle ligados a hitos y expansión.' },
      impact: { en: '+4 pp week-4 retention and lower churn risk index.', es: '+4 pp en retención semana 4 y menor índice de churn.' },
      rice: 260
    }
  ];

  readonly dataOverloadRules: { en: string; es: string }[] = [
    { en: 'Executive layer keeps only 5-7 KPIs with owner and decision attached.', es: 'La capa ejecutiva conserva solo 5-7 KPIs con owner y decisión asociada.' },
    { en: 'Squad layer limits to 10-15 operational metrics by journey.', es: 'La capa squad limita a 10-15 métricas operativas por journey.' },
    { en: 'Unused metrics are sunset after 30-60 days.', es: 'Métricas sin uso se retiran tras 30-60 días.' },
    { en: 'All views prioritize trend and benchmark over isolated absolute values.', es: 'Todas las vistas priorizan tendencia y benchmark sobre valores absolutos aislados.' },
    { en: 'Default dashboard follows overview first and drill-down on anomaly only.', es: 'El dashboard por defecto sigue overview primero y drill-down solo ante anomalías.' }
  ];

  t(text: { en: string; es: string }): string {
    return this.lang.currentLang() === 'es' ? text.es : text.en;
  }
}
