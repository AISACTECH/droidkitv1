import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Smartphone, Cpu, Shield, Bug, Zap } from "lucide-react"
import { BrandId } from "./BrandRibbon"

interface ModelItem {
  key: string
  marketing_name: string
  model_code?: string
  series?: string
  chipset: string
  chipset_family: string
  supported_methods: string[]
  has_mtk_auth?: boolean
  requires_preauthorized_adb?: boolean
  supports_download_mode?: boolean
  available_in_kenya?: boolean
  notes?: string | null
}

interface Props {
  brand: BrandId
  models: ModelItem[]
  filteredModels: ModelItem[]
  searchQuery: string
  onSearchChange: (q: string) => void
  onSearch: () => void
  selectedModelKey: string | null
  onSelect: (item: ModelItem) => void
  platformFilter: string
  totalCount: number
}

export function ModelBrowser({ brand, filteredModels, searchQuery, onSearchChange, onSearch, selectedModelKey, onSelect, totalCount }: Props) {
  return (
    <div className="flex flex-col h-full border rounded-lg bg-card overflow-hidden">
      {/* Search header - inspired by TFT Enter text to search but original */}
      <div className="p-2 border-b bg-muted/30 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Enter text to search..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSearch()}
            className="pl-7 h-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-6 text-[11px] flex-1" onClick={onSearch}>Search</Button>
          <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => { onSearchChange(""); onSearch(); }}>Clear</Button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono">Platform: Auto</span>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[9px] px-1 py-0">BROM</Badge>
            <Badge variant="outline" className="text-[9px] px-1 py-0">EDL</Badge>
          </div>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-1">
          {filteredModels.slice(0, 100).map(item => {
            const isSelected = selectedModelKey === item.key
            return (
              <Card
                key={item.key}
                className={`cursor-pointer transition-all ${isSelected ? "border-primary bg-primary/10 shadow-sm" : "hover:bg-muted/50 border-border/50"}`}
                onClick={() => onSelect(item)}
              >
                <CardContent className="p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate flex items-center gap-1">
                        <Smartphone className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {item.marketing_name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate flex items-center gap-1 mt-0.5">
                        <Cpu className="h-3 w-3" />
                        {item.model_code || item.series} • {item.chipset}
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 items-end shrink-0">
                      <div className="flex gap-0.5">
                        {item.has_mtk_auth && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-red-500/10 text-red-400 border-red-500/30">Auth</Badge>}
                        {item.supports_download_mode && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-500/10 text-blue-400 border-blue-500/30">TP</Badge>}
                        {item.requires_preauthorized_adb && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Beta</Badge>}
                      </div>
                      <Badge variant="outline" className="text-[8px] px-1 py-0">
                        {item.supported_methods.length} methods
                      </Badge>
                    </div>
                  </div>
                  {item.chipset_family && (
                    <div className="mt-1 flex gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 ${
                          item.chipset_family === "MediaTek" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          item.chipset_family === "Qualcomm" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          item.chipset_family === "Spreadtrum" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                          item.chipset_family === "Exynos" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {item.chipset_family}
                      </Badge>
                      {item.available_in_kenya && <Badge variant="outline" className="text-[9px] px-1 py-0 bg-orange-500/10 text-orange-400">KE</Badge>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
          {filteredModels.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <Shield className="h-6 w-6 mx-auto mb-2 opacity-30" />
              No models found for "{searchQuery}" in {brand.toUpperCase()}
              <div className="text-[10px] mt-1">Try different brand or clear search</div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer - inspired by TFT Init: 123 Models */}
      <div className="p-2 border-t bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Init: {totalCount} Models</span>
        <span className="hidden md:flex items-center gap-1"><Bug className="h-3 w-3" /> {filteredModels.length} shown • v1.0.0</span>
        <span className="font-mono text-[9px]">B450M PRO-VDH MAX • Windows 11 • VIKAS</span>
      </div>
    </div>
  )
}
