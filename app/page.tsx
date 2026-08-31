"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CopilotKit, useAgentContext , CopilotChat, useAgent  } from "@copilotkit/react-core/v2";
import type { Message } from "@ag-ui/client";
import PapersSidebar from "./papers_sidebar";
import UserDropdown from "./user_dropdown";

type AgentKey = "search" | "analysis" | "simulation";

const AGENTS = {
  search: { agentId: "search_agent", title: "Research Agent", description: "Cerca articoli scientifici in campo informatico." },
  analysis: { agentId: "analysis_agent", title: "Analysis Agent", description: "Riassume e confronta gli articoli selezionati. Permette di impostare un piano di lavoro." },
  simulation: { agentId: "simulation_agent", title: "Simulation Agent", description: "Estrae il codice da un articolo e lo esegue in un container Docker isolato." },
};

const AGENT_ID_TO_KEY: Record<string, AgentKey> = {
  search_agent: "search",
  analysis_agent: "analysis",
  simulation_agent: "simulation",
};

function HomeContent() {
  const [activeAgent, setActiveAgent] = useState<AgentKey>("search");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const handleSelectSession = useCallback((sessionId: string | null, agentId?: string) => {
    if (agentId && AGENT_ID_TO_KEY[agentId]) {
      setActiveAgent(AGENT_ID_TO_KEY[agentId]);
    }
    setActiveSessionId(sessionId);
  }, []);

  const handleSessionCreated = useCallback((sessionId: string, agentId?: string) => {
    if (agentId && AGENT_ID_TO_KEY[agentId]) {
      setActiveAgent(AGENT_ID_TO_KEY[agentId]);
    }
    setActiveSessionId(sessionId);
  }, []);
  
  const activeAgentId = AGENTS[activeAgent].agentId;

  const toggleAgent = (key: Exclude<AgentKey, "search">) => {
    setActiveAgent((prev) => (prev === key ? "search" : key));
  };

  function convertRunsToCopilotMessages(chatHistory: any[] | undefined): Message[] {
    if (!Array.isArray(chatHistory)) return [];

    return chatHistory
      .filter((msg) => typeof msg.content === "string" && msg.content.trim().length > 0)
      .map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
  }

  function ChatWithHistory({ activeAgentId, activeSessionId }: {activeAgentId: string; activeSessionId: string | null;}) {
    const { agent } = useAgent({ agentId: activeAgentId });

    useEffect(() => {
      if (!activeSessionId) return;
      let cancelled = false;

      fetch(`/api/sessions/${activeSessionId}?agent_id=${activeAgentId}`)
        .then((r) => r.json())
        .then((sessionDetail) => {
          if (cancelled || !agent) return;
          agent.setMessages(convertRunsToCopilotMessages(sessionDetail.chat_history));
        });

      return () => { cancelled = true; };
    }, [activeSessionId, activeAgentId, agent]);

    return (
      <CopilotChat
        key={`${activeAgentId}-${activeSessionId ?? "new"}`}
        agentId={activeAgentId}
        threadId={activeSessionId ?? undefined}
        className="h-full min-h-0 dark-chat"
        messageView="dark-chat text-neutral-100"
        input="bg-slate-900 border-slate-800"
        scrollView="pb-30"
        labels={{
          welcomeMessageText: "Come posso aiutarti oggi?",
          chatInputPlaceholder: "Scrivi un messaggio...",
          chatDisclaimerText: "L'IA può commettere errori. Verifica sempre le informazioni fornite.",
        }}
      />
    );
  }

  return (
    <main className="h-screen w-full flex text-slate-100 overflow-hidden">
      <PapersSidebar 
        activeAgentId={activeAgentId} 
        activeSessionId={activeSessionId} 
        onSelectSession={handleSelectSession} 
        onSessionCreated={handleSessionCreated}
      />
      
      <div className="flex-1 h-full flex flex-col border-r border-neutral-800 ">
        <header className="p-4 border-b border-neutral-800 bg-[#0f0f0f] flex justify-between items-center">
          <h1 className="font-semibold text-lg text-neutral-200">Research Assistant</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
            Attivo: {AGENTS[activeAgent].title}
          </span>
        </header>

        <div className="flex-1 overflow-hidden min-h-0 ">  
          <ChatWithHistory 
            activeAgentId={activeAgentId} 
            activeSessionId={activeSessionId} 
          />
        </div>
      </div>

      <aside className="w-80 h-full bg-neutral-950 p-5 flex flex-col gap-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Agenti specializzati
          </h2>
          <p className="text-xs text-neutral-500">
            L'agente di ricerca è sempre attivo, mentre gli altri due agenti possono essere abilitati per analizzare e simulare il codice degli articoli selezionati.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {(["analysis", "simulation"] as const).map((key) => {
            const isActive = activeAgent === key;
            const { title, description } = AGENTS[key];
            return (
              <div
                key={key}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? "border-blue-500/80 bg-blue-950/30 shadow-lg shadow-blue-500/10"
                    : "border-neutral-800 bg-neutral-950/50 hover:border-neutral-700"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-neutral-200 text-sm">{title}</h3>
                  <button
                    onClick={() => toggleAgent(key)}
                    className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                      isActive ? "bg-blue-600 text-white" : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                    }`}>
                    {isActive ? "Attivo" : "Abilita"}
                  </button>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">{description}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-auto pt-6 flex justify-end">
          <UserDropdown />
        </div>
      </aside>
    </main>
  );
}

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" enableInspector={false}>
      <HomeContent />
    </CopilotKit>
  );
}