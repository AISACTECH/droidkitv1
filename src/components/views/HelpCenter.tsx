import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  HELP_META, BAND_LEGEND, POLICIES, QUICK_START, SETUP_SECTIONS,
  TROUBLESHOOTING, TOOL_GUIDES, FAQS, GLOSSARY, GET_HELP_STEPS, HELP_LINKS,
  type HelpTone,
} from "@/lib/help-content"
import {
  HelpCircle, Search, Download, Rocket, Wrench, LayoutGrid, Scale,
  FileQuestion, BookOpen, ShieldAlert, Printer, ExternalLink,
} from "lucide-react"

// =====================================================================
// Help & Policies — always available (no device needed).
// Renders the SAME data module (src/lib/help-content.ts) that builds
// docs/DROIDKIT-HELP-GUIDE.pdf, so the app and the printable guide can
// never drift apart. Additive view: sends zero device commands.
// =====================================================================

type SectionId = "start" | "setup" | "tools" | "policies" | "faq" | "words"

const SECTIONS: { id: SectionId; label: string; icon: typeof Rocket }[] = [
  { id: "start", label: "Start here", icon: Rocket },
  { id: "setup", label: "Setup", icon: Wrench },
  { id: "tools", label: "Tools", icon: LayoutGrid },
  { id: "policies", label: "Policies", icon: Scale },
  { id: "faq", label: "FAQ", icon: FileQuestion },
  { id: "words", label: "Bands & words", icon: BookOpen },
]

const toneCls: Record<HelpTone, string> = {
  green: "border-green-500/40 text-green-300 bg-green-500/10",
  amber: "border-yellow-500/40 text-yellow-300 bg-yellow-500/10",
  red: "border-red-500/40 text-red-300 bg-red-500/10",
  slate: "border-slate-400/40 text-slate-300 bg-slate-500/10",
}

function ToneBadge({ tone, label }: { tone: HelpTone; label: string }) {
  return <Badge variant="outline" className={`text-[9px] px-1 py-0 ${toneCls[tone]}`}>{label}</Badge>
}

function NumberedSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-1 text-[11px]">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-1.5">
          <span className="text-muted-foreground shrink-0">{i + 1}.</span>
          <span className="flex-1">{s}</span>
        </li>
      ))}
    </ol>
  )
}

export function HelpCenter() {
  const [section, setSection] = useState<SectionId>("start")
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()

  const hits = useMemo(() => {
    if (!q) return null
    const faqs = FAQS.filter(f => `${f.q} ${f.a} ${f.tag}`.toLowerCase().includes(q))
    const tools = TOOL_GUIDES.filter(t => `${t.name} ${t.what} ${t.how.join(" ")}`.toLowerCase().includes(q))
    const words = GLOSSARY.filter(g => `${g.term} ${g.meaning}`.toLowerCase().includes(q))
    const policies = POLICIES.filter(p => `${p.title} ${p.paras.join(" ")}`.toLowerCase().includes(q))
    return { faqs, tools, words, policies }
  }, [q])

  const openPdf = () => {
    try {
      const a = document.createElement("a")
      a.href = HELP_META.pdfInApp
      a.download = "DroidKit-Help-Guide.pdf"
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch { /* webview blocked it — the PDF also lives at docs/DROIDKIT-HELP-GUIDE.pdf */ }
  }

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2 flex-wrap">
          <HelpCircle className="h-5 w-5 text-cyan-400" />
          Help &amp; Policies — instructions, honest rules, answers
          <Badge variant="outline" className="text-[9px]">works offline · no device needed</Badge>
        </h2>
        <p className="text-xs text-muted-foreground">
          {HELP_META.appName} by {HELP_META.publisher} — {HELP_META.tagline}. {HELP_META.edition}.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-3">
          {/* law banner + PDF + search */}
          <Card>
            <CardContent className="p-2.5 space-y-2">
              <div className="flex items-start gap-2 text-[11px]">
                <ShieldAlert className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  The honesty law applies to every answer here: bands over promises, no invented percentages,
                  misses stay visible. No page of this help will ever claim what physics cannot deliver.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={openPdf}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Full-colour PDF guide (bundled)
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-7 text-[11px]"
                  onClick={() => { try { window.print() } catch { /* desktop webview: use the PDF */ } }}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print this view
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  PDF also ships in the repo at {HELP_META.pdfInRepo}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search help… (e.g. Orange MiFi, HDMI, Watu, pattern)"
                  className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/60"
                />
                {q && (
                  <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setQuery("")}>
                    clear
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* search results replace the section view */}
          {hits ? (
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs">
                  Results for “{query.trim()}” — {hits.faqs.length + hits.tools.length + hits.words.length + hits.policies.length} match(es)
                </CardTitle>
                <CardDescription className="text-[11px]">Clear the search to return to the sections.</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {hits.faqs.map((f, i) => (
                  <div key={`f${i}`} className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{f.q}</span>
                      <ToneBadge tone="slate" label={f.tag} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{f.a}</p>
                  </div>
                ))}
                {hits.tools.map((t, i) => (
                  <div key={`t${i}`} className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
                    <span className="text-xs font-medium">{t.name}</span>
                    <p className="text-[11px] text-muted-foreground">{t.what}</p>
                    <NumberedSteps steps={t.how} />
                  </div>
                ))}
                {hits.policies.map((p, i) => (
                  <div key={`p${i}`} className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
                    <span className="text-xs font-medium">{p.title}</span>
                    {p.paras.map((para, j) => <p key={j} className="text-[11px] text-muted-foreground">{para}</p>)}
                  </div>
                ))}
                {hits.words.map((g, i) => (
                  <div key={`w${i}`} className="p-2 rounded-lg border bg-muted/30 text-[11px]">
                    <span className="font-medium">{g.term}</span>
                    <span className="text-muted-foreground"> — {g.meaning}</span>
                  </div>
                ))}
                {hits.faqs.length + hits.tools.length + hits.words.length + hits.policies.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    No match. Try a shorter word (“modem”, “password”, “patch”) — or open a GitHub issue from the Bands &amp; words tab.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* section picker */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {SECTIONS.map(s => (
                      <Button
                        key={s.id}
                        size="sm"
                        variant={section === s.id ? "default" : "outline"}
                        className="h-7 text-[11px]"
                        onClick={() => setSection(s.id)}
                      >
                        <s.icon className="h-3.5 w-3.5 mr-1" /> {s.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* START */}
              {section === "start" && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2"><Rocket className="h-3.5 w-3.5 text-cyan-400" /> Start here — working in 6 steps</CardTitle>
                    <CardDescription className="text-[11px]">Then read the traffic-light meaning once; it protects you from every scam on the internet.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    <NumberedSteps steps={QUICK_START} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {BAND_LEGEND.map(b => (
                        <div key={b.band} className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
                          <ToneBadge tone={b.tone} label={b.band} />
                          <p className="text-[11px] text-muted-foreground">{b.meaning}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SETUP */}
              {section === "setup" && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2"><Wrench className="h-3.5 w-3.5 text-cyan-400" /> Setup, step by step</CardTitle>
                    <CardDescription className="text-[11px]">Install, drivers, USB debugging, first tour — plus the fixes for the classic failures.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    {SETUP_SECTIONS.map(s => (
                      <div key={s.id} className="p-2.5 rounded-lg border bg-muted/30 space-y-1.5">
                        <span className="text-xs font-medium">{s.title}</span>
                        {s.intro && <p className="text-[11px] text-muted-foreground">{s.intro}</p>}
                        <NumberedSteps steps={s.steps.map(st => st.text)} />
                      </div>
                    ))}
                    <div className="p-2.5 rounded-lg border bg-muted/30 space-y-1.5">
                      <span className="text-xs font-medium">When it refuses: symptom doctor</span>
                      <div className="space-y-1.5">
                        {TROUBLESHOOTING.map((r, i) => (
                          <div key={i} className="text-[11px] rounded border border-border/60 p-2">
                            <p className="font-medium">{r.symptom}</p>
                            <p className="text-muted-foreground">Why: {r.cause}</p>
                            <p className="text-green-300/90">Fix: {r.fix}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* TOOLS */}
              {section === "tools" && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2"><LayoutGrid className="h-3.5 w-3.5 text-cyan-400" /> Every tool, what it does, how to drive it</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {TOOL_GUIDES.map(t => (
                      <div key={t.id} className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
                        <span className="text-xs font-medium">{t.name}</span>
                        <p className="text-[11px] text-muted-foreground">{t.what}</p>
                        <NumberedSteps steps={t.how} />
                        {t.honesty && (
                          <p className="text-[10px] p-1.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-200">{t.honesty}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* POLICIES */}
              {section === "policies" && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2"><Scale className="h-3.5 w-3.5 text-cyan-400" /> The policies, in plain words</CardTitle>
                    <CardDescription className="text-[11px]">What we promise, what we refuse, and what we will never do — colour-coded by strictness.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {POLICIES.map(p => (
                      <div key={p.id} className={`p-2.5 rounded-lg border-l-4 space-y-1 ${toneCls[p.tone]} bg-opacity-5`} style={{ backgroundColor: "transparent" }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">{p.title}</span>
                          <ToneBadge tone={p.tone} label={p.tone === "red" ? "NEVER" : p.tone === "amber" ? "RULE" : p.tone === "green" ? "PROMISE" : "NOTE"} />
                        </div>
                        {p.paras.map((para, i) => <p key={i} className="text-[11px] text-muted-foreground">{para}</p>)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* FAQ */}
              {section === "faq" && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2"><FileQuestion className="h-3.5 w-3.5 text-cyan-400" /> Frequent questions ({FAQS.length})</CardTitle>
                    <CardDescription className="text-[11px]">The search box above also searches these answers.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {FAQS.map((f, i) => (
                      <div key={i} className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium">{f.q}</span>
                          <ToneBadge tone="slate" label={f.tag} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{f.a}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* WORDS / BANDS + GET HELP */}
              {section === "words" && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-3">
                    <CardTitle className="text-xs flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-cyan-400" /> Bands, words, and getting human help</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {GLOSSARY.map((g, i) => (
                        <div key={i} className="p-2 rounded-lg border bg-muted/30 text-[11px]">
                          <span className="font-medium">{g.term}</span>
                          <span className="text-muted-foreground"> — {g.meaning}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/30 space-y-1.5">
                      <span className="text-xs font-medium">Getting human help, in order</span>
                      <NumberedSteps steps={GET_HELP_STEPS} />
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/30 space-y-1">
                      <span className="text-xs font-medium">Links</span>
                      {HELP_LINKS.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] flex-wrap">
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{l.label}:</span>
                          <a href={l.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-dotted break-all">{l.url}</a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
