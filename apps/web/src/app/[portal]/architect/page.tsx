"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { demoData, getArchitectResponse } from "@capstone/demo-data";
import { PortalShell } from "@/components/portal-shell";
import { PortalScopeBanner, usePortalRoute } from "@/components/portal-route";
import { usePortalHref } from "@/hooks/use-portal-href";
import {
  PageHeader,
  GlassCard,
  PremiumBadge,
  GradientStatCard,
} from "@/components/premium";
import { Button, formatINR } from "@capstone/ui";
import {
  Sparkles,
  Send,
  BookOpen,
  TrendingUp,
  Shield,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { ARCHITECT_FALLBACK, PLATFORM_DISCLAIMER, type ArchitectResponse } from "@capstone/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  response?: ArchitectResponse;
}

const quickActions = [
  { icon: TrendingUp, title: "Portfolio", prompt: "What's my real exposure to IT stocks?" },
  { icon: Shield, title: "Tax Query", prompt: "Can I gift ₹50L to my HUF?" },
  { icon: Calendar, title: "Advance Tax", prompt: "Do I need to pay advance tax this quarter?" },
  { icon: BookOpen, title: "Harvest", prompt: "How much tax will I save with the TATASTEEL harvest?" },
];

export default function ArchitectPage() {
  usePortalRoute("architect");
  const href = usePortalHref();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { architect, family } = demoData;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setTyping(true);

    await new Promise((r) => setTimeout(r, 900));

    const response = getArchitectResponse(text);
    const answer = response?.answer ?? ARCHITECT_FALLBACK;

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: answer, response: response ?? undefined },
    ]);
    setTyping(false);
  };

  const formatAnswer = (text: string) =>
    text.split("\n").map((line, i) => {
      const html = line.replace(/\*\*(.*?)\*\*/g, "<strong class='text-foreground font-semibold'>$1</strong>");
      return (
        <p key={i} className="mb-2 last:mb-0 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      );
    });

  return (
    <PortalShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="ARCHITECT"
          title="AI Wealth Copilot"
          description="Portfolio-aware, citation-backed, action-oriented — your 24/7 command advisor."
          icon={<Sparkles className="h-8 w-8 text-accent-purple" />}
          badge={<PremiumBadge variant="info">Demo Mode</PremiumBadge>}
        />

        <PortalScopeBanner />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.title}
                type="button"
                onClick={() => sendMessage(action.prompt)}
                className="glass-card p-4 text-left hover:border-accent-purple/30 hover:bg-white/[0.03] transition-all group"
              >
                <Icon className="h-5 w-5 text-accent-purple mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.prompt}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col xl:flex-row gap-6 min-h-[520px]">
          <GlassCard padding="none" className="flex-1 flex flex-col overflow-hidden min-h-[480px]">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-gradient-to-r from-accent-purple/10 to-transparent">
              <MessageSquare className="h-4 w-4 text-accent-purple" />
              <span className="text-sm font-medium">Conversation</span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-purple/15 mb-4">
                    <Sparkles className="h-8 w-8 text-accent-purple" />
                  </div>
                  <p className="text-muted-foreground mb-6">Ask ARCHITECT about wealth, tax, or compliance</p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                    {architect.suggested_prompts.slice(0, 4).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        className="rounded-full border border-border bg-white/[0.03] px-4 py-2 text-xs text-foreground hover:border-accent-purple/40 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-accent-blue to-accent-purple text-white"
                        : "glass-card-solid border border-border"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : (
                      <>
                        {formatAnswer(msg.content)}
                        {msg.response?.citations && msg.response.citations.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-border space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gold flex items-center gap-1">
                              <BookOpen className="h-3 w-3" /> Citations
                            </p>
                            {msg.response.citations.map((c, j) => (
                              <div key={j} className="text-xs text-muted-foreground">
                                <span className="text-accent-blue">{c.source}</span>
                                {c.section && ` · ${c.section}`}
                              </div>
                            ))}
                          </div>
                        )}
                        {msg.response?.action_card_id && (
                          <Link href={href(`actions/${msg.response.action_card_id}`)}>
                            <Button variant="gold" size="sm" className="mt-3 !rounded-lg">
                              View Action Card
                            </Button>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <div className="glass-card-solid rounded-2xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    ARCHITECT is analyzing...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border p-4 bg-white/[0.01]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about tax, portfolio, or compliance..."
                  className="flex-1 rounded-xl border border-border bg-white/5 px-4 py-3 text-sm focus:border-accent-purple/40 focus:outline-none focus:ring-2 focus:ring-accent-purple/15"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="!rounded-xl !px-4 !bg-gradient-to-r !from-accent-purple !to-accent-blue !border-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                {PLATFORM_DISCLAIMER}
              </p>
            </div>
          </GlassCard>

          <aside className="xl:w-72 shrink-0 space-y-4">
            <GradientStatCard
              variant="dark"
              label="Portfolio Context"
              value={formatINR(family.total_net_worth_inr, { compact: true })}
              sublabel={`${family.entity_count} entities · ${family.held_away_pct}% held-away`}
            />
            <GlassCard>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Suggested prompts
              </p>
              <div className="space-y-1">
                {architect.suggested_prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left text-xs text-muted-foreground hover:text-accent-purple py-2 border-b border-border last:border-0 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </GlassCard>
          </aside>
        </div>
      </div>
    </PortalShell>
  );
}
