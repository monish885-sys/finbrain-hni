export { CALCULATOR_REGISTRY, calculateTaxSlab, compareTaxRegime, computeStcgLtcg, computeIndexation, computeAdvanceTax, computeSection54F, pairHarvestLots } from "./calculators";
export { retrieveCitations, hasCitationMatch, getCorpusChunk, retrieveStrategyBullets } from "./rag/retrieve";
export { CorpusStore, getCorpusStore, resetCorpusStore } from "./corpus/store";
export type { IndexedCorpusChunk, CorpusChunkRecord, CorpusSourceFile } from "./corpus/types";
export { getBuddyConfig, resetBuddyConfigCache, listCorpusFiles } from "./config/loader";
export { classifyIntent } from "./orchestrator/classifier";
export { ask, askSync, validateResponse } from "./orchestrator/ask";
export { askDemo, askDemoSync, getKapoorPortfolio } from "./ask-demo";
export type { AskDemoOptions } from "./ask-demo";
export { buildPortfolioContext, matchSectorQuery } from "./context/portfolio";

export { runDeterministicEval, loadGoldenScenarios } from "./evals/runner";
export { runToolsForIntent } from "./extraction/tool-resolver";
export { synthesizeWithLlm } from "./llm/adapter";
export { buildFinancialCalendar, resetCalendarConfigCache } from "./calendar/build-calendar";
export { analyzeHniFy, formatFyReportAnswer } from "./fy/analyze";
export { planFyDecisions } from "./fy/decision-planner";
export {
  createBrainset,
  runDailyDesk,
  buildCaReviewPack,
  formatDayPlanAnswer,
  applyCaReview,
  applyHniApproval,
  hniClearedActionCards,
} from "./desk";
export { SUPPORTED_FY } from "./constants/fy-2025-26";
