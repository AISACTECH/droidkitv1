import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BRAND } from "@/lib/brand"
import { Mail, User, Shield } from "lucide-react"

export function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">About {BRAND.name}</h3>
        <p className="text-sm text-muted-foreground">
          Product identity, developer, and how to reach the person who built this.
        </p>
      </div>

      <Card className="border-cyan-500/20 overflow-hidden">
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-950 to-indigo-950">
          <img src={BRAND.icon128} alt={BRAND.name} className="size-16 rounded-2xl shadow-lg" />
          <div>
            <div className="text-xl font-semibold text-white">{BRAND.name}</div>
            <div className="text-sm text-cyan-200/80">{BRAND.tagline}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] border-cyan-400/40 text-cyan-200">v{BRAND.version}</Badge>
              <Badge variant="outline" className="text-[10px] border-violet-400/40 text-violet-200">{BRAND.edition}</Badge>
            </div>
          </div>
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-cyan-400" /> Device developer
          </CardTitle>
          <CardDescription>The person who owns and ships this toolkit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Developer</div>
            <div className="font-medium">{BRAND.developer}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <a className="font-medium text-cyan-400 hover:underline inline-flex items-center gap-1.5" href={`mailto:${BRAND.email}`}>
              <Mail className="h-3.5 w-3.5" />
              {BRAND.email}
            </a>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-zinc-500/20 bg-zinc-500/5 p-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {BRAND.name} never phones home. Support is email or a public GitHub issue — never passwords, never remote access.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
