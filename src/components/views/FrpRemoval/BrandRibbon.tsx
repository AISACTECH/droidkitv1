import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Smartphone, Cpu, Layers, Filter } from "lucide-react"

export type BrandId = "samsung" | "tecno" | "infinix" | "itel" | "q3" | "q4"
export type ChipsetFilter = "All" | "MediaTek" | "Qualcomm" | "Spreadtrum" | "Exynos" | "Kirin" | "Universal"

interface BrandRibbonProps {
  counts: Record<BrandId, number>
  selectedBrand: BrandId
  onBrandChange: (b: BrandId) => void
  chipsetFilter: ChipsetFilter
  onChipsetChange: (c: ChipsetFilter) => void
  platform: string
}

const brandMeta: Record<BrandId, { label: string; sub: string; icon: typeof Smartphone }> = {
  samsung: { label: "SAMSUNG", sub: "Galaxy", icon: Smartphone },
  tecno: { label: "TECNO", sub: "Pop Spark Camon", icon: Smartphone },
  infinix: { label: "Infinix", sub: "Hot Note Smart", icon: Smartphone },
  itel: { label: "itel", sub: "A P S Vision", icon: Smartphone },
  q3: { label: "Q3", sub: "Xiaomi OPPO Realme", icon: Layers },
  q4: { label: "Q4", sub: "Nokia Moto Credit", icon: Layers },
}

const chipsetOptions: ChipsetFilter[] = ["All", "MediaTek", "Qualcomm", "Spreadtrum", "Exynos", "Kirin", "Universal"]

export function BrandRibbon({ counts, selectedBrand, onBrandChange, chipsetFilter, onChipsetChange, platform }: BrandRibbonProps) {
  return (
    <div className="w-full border rounded-lg bg-card/50 backdrop-blur-sm p-2 space-y-2">
      {/* Top row: brand chips - inspired by TFT top row but original neutral design */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <ScrollArea className="flex-1 whitespace-nowrap">
          <div className="flex gap-1.5 pb-1">
            {(Object.entries(brandMeta) as [BrandId, typeof brandMeta[BrandId]][]).map(([id, meta]) => {
              const Icon = meta.icon
              const isSelected = selectedBrand === id
              return (
                <button
                  key={id}
                  onClick={() => onBrandChange(id)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all whitespace-nowrap
                    ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background hover:bg-muted border-border/60 hover:border-border"}
                  `}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span className="tracking-wide">{meta.label}</span>
                  <Badge variant={isSelected ? "secondary" : "outline"} className="text-[10px] px-1 py-0 h-4 ml-1">
                    {counts[id] ?? 0}
                  </Badge>
                </button>
              )
            })}
            <div className="w-px bg-border mx-1 shrink-0" />
            {/* Extra platform brands inspired but not copied — future ready */}
            <div className="flex items-center gap-1 opacity-60 pointer-events-none">
              <Badge variant="outline" className="text-[10px]">MI • HUAWEI • LG • ASUS • Apple (Coming Soon)</Badge>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Second row: chipset / protocol filter — inspired by TFT BROM/EDL row but original */}
      <div className="flex items-center gap-2">
        <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <ScrollArea className="flex-1 whitespace-nowrap">
          <div className="flex gap-1 pb-1">
            <div className="text-[10px] text-muted-foreground px-2 py-1 flex items-center gap-1">
              Platform: <span className="font-mono font-medium text-foreground">{platform}</span>
            </div>
            {chipsetOptions.map(chip => (
              <Button
                key={chip}
                variant={chipsetFilter === chip ? "default" : "ghost"}
                size="sm"
                className="h-6 text-[11px] px-2.5"
                onClick={() => onChipsetChange(chip)}
              >
                {chip}
              </Button>
            ))}
            <div className="flex items-center gap-1 ml-2">
              <Badge variant="outline" className="text-[10px]">BROM</Badge>
              <Badge variant="outline" className="text-[10px]">EDL</Badge>
              <Badge variant="outline" className="text-[10px]">PRELOADER Auth</Badge>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
}
