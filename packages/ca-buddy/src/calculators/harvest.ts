import type { HarvestLot, HarvestPairResult } from "@capstone/types";
import { EQUITY_STCG_RATE } from "../constants/fy-2025-26";

/**
 * Pair loss lots against gain lots to maximize tax offset (same gain type first).
 * Tax saved estimated at equity STCG rate for harvest Action Cards.
 */
export function pairHarvestLots(lots: HarvestLot[]): HarvestPairResult {
  const losses = lots.filter((l) => l.gain_loss_inr < 0).sort((a, b) => a.gain_loss_inr - b.gain_loss_inr);
  const gains = lots.filter((l) => l.gain_loss_inr > 0).sort((a, b) => b.gain_loss_inr - a.gain_loss_inr);

  const pairs: HarvestPairResult["pairs"] = [];
  const lossRemaining = losses.map((l) => ({ ...l, remaining: Math.abs(l.gain_loss_inr) }));
  const gainRemaining = gains.map((g) => ({ ...g, remaining: g.gain_loss_inr }));

  for (const loss of lossRemaining) {
    for (const gain of gainRemaining) {
      if (loss.remaining <= 0 || gain.remaining <= 0) continue;
      if (loss.gain_type !== gain.gain_type) continue;
      const offset = Math.min(loss.remaining, gain.remaining);
      pairs.push({
        loss_lot_id: loss.lot_id,
        gain_lot_id: gain.lot_id,
        offset_inr: offset,
      });
      loss.remaining -= offset;
      gain.remaining -= offset;
    }
  }

  const totalOffset = pairs.reduce((s, p) => s + p.offset_inr, 0);
  const unpairedLosses = lossRemaining.reduce((s, l) => s + l.remaining, 0);
  const unpairedGains = gainRemaining.reduce((s, g) => s + g.remaining, 0);

  return {
    pairs,
    total_tax_saved_inr: Math.round(totalOffset * EQUITY_STCG_RATE),
    unpaired_losses_inr: unpairedLosses,
    unpaired_gains_inr: unpairedGains,
  };
}
