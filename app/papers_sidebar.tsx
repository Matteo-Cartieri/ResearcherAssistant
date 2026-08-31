import { useEffect, useState, useCallback, useRef } from "react";
import { useAgent, UseAgentUpdate } from "@copilotkit/react-core/v2";
import { DocIcon, TrashIcon } from "./icons";

type Paper = {
  id: string;
  user_id: string;
  arxiv_id: string;
  title: string;
  pdf_url: string;
  published_at: string | null;
  selected: boolean;
  indexed: boolean;
  created_at: string;
  updated_at: string;
};

type Session = {
  session_id: string;
  session_name?: string | null;
  agent_id: string;
  user_id?: string | null;
  created_at?: number | string | null;
  updated_at?: number | string | null;
};

const AGENT_LABELS: Record<string, string> = {
  search_agent: "Ricerca",
  analysis_agent: "Analisi",
  simulation_agent: "Simulazione",
};

const ALL_AGENT_IDS = ["search_agent", "analysis_agent", "simulation_agent"];

function sortByRecency(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return bTime - aTime;
  });
}

function dedupeSessions(sessions: Session[]): Session[] {
  const map = new Map<string, Session>();
  for (const s of sessions) {
    if (!map.has(s.session_id)) map.set(s.session_id, s);
  }
  return Array.from(map.values());
}

async function fetchAllSessions(): Promise<Session[]> {
  const results = await Promise.all(
    ALL_AGENT_IDS.map(async (agentId) => {
      const response = await fetch(`/api/sessions?agent_id=${encodeURIComponent(agentId)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) return [];
      const data = await response.json();
      const sessions: Session[] = Array.isArray(data?.sessions) ? data.sessions : [];
      return sessions.map((s) => ({ ...s, agent_id: s.agent_id ?? agentId }));
    })
  );
  return dedupeSessions(results.flat());
}

function formatSessionTitle(session: Session) {
  if (session.session_name && session.session_name.trim().length > 0) { return session.session_name; }
  return `Sessione ${session.session_id.slice(0, 8)}`;
}

export default function PapersSidebar({ activeAgentId, activeSessionId, onSelectSession, onSessionCreated }) {
  const { agent } = useAgent({ agentId: "search_agent", updates: [UseAgentUpdate.OnStateChanged] });
  const agentPapers = (agent.state?.papers as Paper[]) ?? [];
  const [pendingPaperIds, setPendingPaperIds] = useState<Set<string>>(new Set());
  const initialLoadRef = useRef(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);

  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);

  const createSessionForAgent = useCallback(
    async (agentId: string) => {
      setCreatingSession(true);
      try {
        const date = new Date().toLocaleString("it-IT", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const label = AGENT_LABELS[agentId] ?? "Ricerca";
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_id: agentId,
            session_name: `${label} - ${date}`,
          }),
        });
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`Failed to create session: ${response.status} ${body}`);
        }
        const data = await response.json();
        const newSession = data?.session as Session | undefined;
        if (!newSession?.session_id) {
          throw new Error("AgentOS did not return a session_id");
        }
        const normalizedSession: Session = { ...newSession, agent_id: newSession.agent_id ?? agentId };

        setSessions((previous) =>
          sortByRecency([normalizedSession, ...previous.filter((s) => s.session_id !== normalizedSession.session_id)])
        );
        onSessionCreated(normalizedSession.session_id, normalizedSession.agent_id);
      } catch (error) {
        console.error("Unable to create session:", error);
        window.alert("Non è stato possibile creare una nuova sessione.");
      } finally {
        setCreatingSession(false);
      }
    },
    [onSessionCreated]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadAllSessions() {
      setLoadingSessions(true);
      try {
        const merged = sortByRecency(await fetchAllSessions());
        if (cancelled) return;
        setSessions(merged);
        if (!initialLoadRef.current) {
          initialLoadRef.current = true;
          if (merged.length > 0) {
            onSelectSession(merged[0].session_id, merged[0].agent_id);
          }
        }
      } catch (error) {
        console.error("Unable to load sessions:", error);
        if (!cancelled) setSessions([]);
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    }
    loadAllSessions();
    return () => {
      cancelled = true;
    };
  }, []);
    
  // after clicking "Abilita" on Analysis/Simulation in the right sidebar,  
  // creates a new session for that agent
  useEffect(() => {
    if (!initialLoadRef.current || loadingSessions) return;

    const currentlyActiveSession = sessions.find((s) => s.session_id === activeSessionId);
    if (currentlyActiveSession?.agent_id === activeAgentId) {
      return;
    }

    createSessionForAgent(activeAgentId);
  }, [activeAgentId]);

  async function deleteSession(sessionId: string) {
    const confirmed = window.confirm("Sei sicuro di voler eliminare questa sessione?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/sessions?session_id=${encodeURIComponent(sessionId)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      // Calculate the sessions that will remain before updating React state.
      const remaining = sessions.filter((session) => session.session_id !== sessionId);
      setSessions(remaining);

      // If the deleted session was active, select another session if available.
      if (sessionId === activeSessionId) {
        if (remaining.length > 0) {
          onSelectSession(remaining[0].session_id);
        } else {
          onSelectSession(null);
        }
      }

    } catch (error) {
      console.error("Unable to delete session:", error);
      window.alert("Non è stato possibile eliminare la sessione.");
    }
  }

  async function loadPapers() {
    try {
      const response = await fetch(
        "/api/papers",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load papers: ${response.status}`);
      }
      const data = await response.json();
      const loadedPapers: Paper[] = Array.isArray(data?.papers) ? data.papers : [];
      setPapers(loadedPapers);
    } catch (error) {
      console.error("Unable to load papers:", error);
      setPapers([]);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoadPapers() {
      setLoadingPapers(true);
      try {
        const response = await fetch(
          "/api/papers",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load papers: ${response.status}`);
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        const loadedPapers: Paper[] = Array.isArray(data?.papers) ? data.papers : [];

        setPapers(loadedPapers);
      } catch (error) {
        console.error("Unable to load papers:", error);

        if (!cancelled) {
          setPapers([]);
        }

      } finally {
        if (!cancelled) {
          setLoadingPapers(false);
        }
      }
    }

    initialLoadPapers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function deletePaper(paperId: string) {
    setPendingPaperIds((prev) => new Set(prev).add(paperId));

    try {
      const response = await fetch(
        `/api/papers?paper_id=${encodeURIComponent(paperId)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete paper: ${response.status}`);
      }

      agent.setState({
        ...agent.state,
        papers: agentPapers.filter((p) => p.id !== paperId),
      });

      await loadPapers();
    } catch (error) {
      console.error("Unable to delete paper:", error);
      window.alert("Non è stato possibile eliminare l'articolo.");
    } finally {
      setPendingPaperIds((prev) => {
        const next = new Set(prev);
        next.delete(paperId);
        return next;
      });
    }
  }

  const toggleSelected = async (id: string) => {
    const paper = papers.find((p) => p.id === id);
    if (!paper) {
      console.error(`Paper ${id} not found`);
      return;
    }

    const wantSelected = !paper.selected;
    setPendingPaperIds((prev) => new Set(prev).add(id));

    try {
      const response = await fetch("/api/knowledge/index", {
        method: wantSelected ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paper_id: id }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to ${wantSelected ? "index" : "deindex"} paper: ${response.status} ${body}`);
      }

      await loadPapers();
    } catch (error) {
      console.error("Unable to update paper:", error);
      window.alert("Non è stato possibile aggiornare l'articolo.");
      await loadPapers();
    } finally {
      setPendingPaperIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const syncedArxivIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (agentPapers.length === 0) return;
    let cancelled = false;

    async function syncAgentPapers() {
      let insertedSomething = false;

      for (const paper of agentPapers) {
        if (cancelled) return;
        if (syncedArxivIds.current.has(paper.arxiv_id)) continue;

        try {
          const response = await fetch("/api/papers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              arxiv_id: paper.arxiv_id,
              title: paper.title,
              pdf_url: paper.pdf_url,
              published_at: paper.published_at ?? null,
            }),
          });

          if (!response.ok) {
            const body = await response.text();
            throw new Error(`Failed to save paper: ${response.status} ${body}`);
          }

          syncedArxivIds.current.add(paper.arxiv_id);
          insertedSomething = true;
        } catch (error) {
          console.error(`Unable to persist paper ${paper.arxiv_id}:`, error);
        }
      }

      if (insertedSomething && !cancelled) {
        await loadPapers();
      }
    }

    syncAgentPapers();
    return () => { cancelled = true; };
  }, [agentPapers]);

  return (
    <aside className="w-72 h-full bg-neutral-950 flex flex-col border-r border-slate-800">
      {/* Sessions section */}
      <div className="p-5 flex flex-col gap-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Sessioni
          </h2>
        </div>
        <button
          onClick={() => createSessionForAgent("search_agent")}
          disabled={creatingSession}
          className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium
             text-neutral-300 bg-neutral-800/80 border border-neutral-700/50
             hover:bg-neutral-800 hover:border-neutral-600 hover:text-neutral-100
             active:scale-[0.98] transition-all">
          {creatingSession ? "Creazione..." : "+ Nuova sessione"}
        </button>
        {loadingSessions ? (
          <p className="text-xs text-neutral-600 italic">
            Caricamento sessioni...
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-neutral-600 italic">
            Nessuna sessione disponibile.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 max-h-60 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#404040_transparent]">
            {sessions.map((session) => {
              const isActive = session.session_id === activeSessionId;
              return (
                <li key={session.session_id}
                  className="flex items-center w-full">

                  <button
                    onClick={() => onSelectSession(session.session_id, session.agent_id)}
                    className={`flex-1 min-w-0 w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${isActive
                        ? "bg-blue-950/40 text-blue-300 border border-blue-500/30"
                        : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200"
                      }`}
                  >
                    <div className="truncate font-medium">{formatSessionTitle(session)}</div>
                    {/* <div className="text-[10px] text-neutral-500 mt-0.5">{formatSessionDate(session.updated_at ?? session.created_at)}</div> */}
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteSession(session.session_id);
                    }}
                    title="Elimina sessione"
                    aria-label="Elimina sessione"
                    className="shrink-0 mr-1 p-1.5 rounded-md text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Papers section */}
      <div className="p-5 flex flex-col gap-4 flex-1 overflow-hidden">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-1">
            Articoli trovati
          </h2>
          <p className="text-xs text-neutral-500">
            Spunta i PDF da includere nella tua knowledge base.
          </p>
        </div>
        {loadingPapers ? (
          <p className="text-xs text-neutral-600 italic">
            Caricamento articoli...
          </p>
        ) : papers.length === 0 ? (
          <p className="text-xs text-neutral-600 italic">
            Nessun articolo recuperato finora.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#404040_transparent]">
            {papers.map((paper) => (
              <li
                key={paper.id}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-neutral-800/60"
              >
                <DocIcon />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-neutral-300 leading-snug">
                    {paper.title.length > 30 ? `${paper.title.slice(0, 30)}...` : paper.title}
                  </div>
                  {paper.indexed && (
                    <div className="text-[10px] text-green-500 mt-1">
                      Pronto per la ricerca
                    </div>
                  )}
                </div>

                {/* <input
                      type="checkbox"
                      checked={paper.selected}
                      onChange={() => toggleSelected(paper.id)}
                      className="mt-0.5 accent-blue-600"
                    /> */}
                {pendingPaperIds.has(paper.id) ? (
                  <span
                    className="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-neutral-500 border-t-blue-500"
                    role="status"
                    aria-label="Aggiornamento"
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={paper.selected}
                    onChange={() => toggleSelected(paper.id)}
                    className="mt-0.5 accent-blue-600"
                  />
                )}

                <button
                  onClick={() => { deletePaper(paper.id) }}
                  title="Elimina paper"
                  aria-label="Elimina paper"
                  className="shrink-0 mr-1 p-1.5 rounded-md text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
