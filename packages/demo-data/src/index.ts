import type { DemoData } from "@capstone/types";
import family from "./family.json";
import holdings from "./holdings.json";
import netWorthHistory from "./net-worth-history.json";
import firewall from "./firewall.json";
import actionCards from "./action-cards.json";
import architect from "./architect-responses.json";
import dailyGlance from "./daily-glance.json";
import honestyCheck from "./honesty-check.json";
import timeMachine from "./time-machine.json";

export const demoData: DemoData = {
  family: family as DemoData["family"],
  holdings: holdings as DemoData["holdings"],
  net_worth_history: netWorthHistory as DemoData["net_worth_history"],
  firewall: firewall as DemoData["firewall"],
  action_cards: actionCards as DemoData["action_cards"],
  architect: architect as DemoData["architect"],
  daily_glance: dailyGlance as DemoData["daily_glance"],
  honesty_check: honestyCheck as DemoData["honesty_check"],
  time_machine: timeMachine as DemoData["time_machine"],
};

export { family, holdings, netWorthHistory, firewall, actionCards, architect, dailyGlance, honestyCheck, timeMachine };

export function getEntityName(entityId: string): string {
  const entity = demoData.family.entities.find((e) => e.id === entityId);
  return entity?.name ?? entityId;
}

export function getPendingActionCards() {
  return demoData.action_cards.filter((c) => c.status === "pending");
}

export function getActionCardById(id: string) {
  return demoData.action_cards.find((c) => c.id === id);
}

export function getMismatchById(id: string) {
  return demoData.firewall.mismatches.find((m) => m.id === id);
}

export function getArchitectResponse(prompt: string) {
  return demoData.architect.responses[prompt];
}
