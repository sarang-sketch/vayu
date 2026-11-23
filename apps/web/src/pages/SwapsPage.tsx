/** Sustainable swaps catalog + household impact ledger. */
import { SWAPS } from '@vayusense/shared';
import { ImpactLedger } from '../components/swaps/ImpactLedger';
import { SwapCard } from '../components/swaps/SwapCard';
import { Card, SectionTitle } from '../components/ui';

export default function SwapsPage() {
  return (
    <div className="space-y-6">
      <SectionTitle
        title="Sustainable swaps with clear impact"
        subtitle="Every swap shows kilograms of CO₂e and grams of PM2.5 avoided — computed from documented emission factors, not vibes."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SWAPS.map((swap) => (
          <SwapCard key={swap.id} swap={swap} />
        ))}
      </div>
      <ImpactLedger />
      <Card>
        <p className="text-xs text-mist-500">
          Methodology: baseline vs alternative factors per unit (km, kWh, kg, meal, minute) drawn
          from public Indian urban-emission studies (CEEW/TERI transport analyses, CPCB source
          apportionment, IPCC AR6 GWP100). Factors are conservative planning estimates; see
          packages/shared/src/impact.ts for the auditable math and unit tests.
        </p>
      </Card>
    </div>
  );
}
