import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, useAnimation } from "motion/react"
import { Trash2Icon } from "lucide-react"
import { useState } from "react"

function ButtonHoldAndRelease({ className, holdDuration = 3000, onHoldComplete, ...props }) {
  const [isHolding, setIsHolding] = useState(false)
  const controls = useAnimation()

  async function handleHoldStart() {
    setIsHolding(true)
    controls.set({ width: "0%" })
    await controls.start({
      width: "100%",
      transition: {
        duration: holdDuration / 1000,
        ease: "linear",
      },
    })
    // Animation completed — user held long enough
    onHoldComplete?.()
  }

  function handleHoldEnd() {
    setIsHolding(false)
    controls.stop()
    controls.start({
      width: "0%",
      transition: { duration: 0.1 },
    })
  }

  return (
    <Button
      className={cn(
        "min-w-40 relative overflow-hidden touch-none",
        "bg-red-100 hover:bg-red-100",
        "text-red-500",
        "border border-red-200",
        className
      )}
      onMouseDown={handleHoldStart}
      onMouseUp={handleHoldEnd}
      onMouseLeave={handleHoldEnd}
      onTouchStart={handleHoldStart}
      onTouchEnd={handleHoldEnd}
      onTouchCancel={handleHoldEnd}
      {...props}
    >
      <motion.div
        initial={{ width: "0%" }}
        animate={controls}
        className="absolute left-0 top-0 h-full bg-red-200/60"
      />
      <span className="relative z-10 w-full flex items-center justify-center gap-2">
        <Trash2Icon className="w-4 h-4" />
        {!isHolding ? "Hold to delete" : "Release"}
      </span>
    </Button>
  )
}

export { ButtonHoldAndRelease }
