import { useEffect, useState } from "react"

/** True when the window is visible. Used to pause ADB polling in the
 *  background so Windows does not treat the app as hung / force-stop it. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  )
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState !== "hidden")
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])
  return visible
}

/** Keep a react-query refetchInterval only while the window is visible. */
export function visibleRefetch(ms: number | false, visible: boolean): number | false {
  return visible && ms ? ms : false
}
