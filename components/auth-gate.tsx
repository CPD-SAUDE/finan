"use client"

import type React from "react"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { isLoggedIn } from "@/lib/auth"

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoggedIn()) {
      const ret = pathname && pathname !== "/login" ? `?returnTo=${encodeURIComponent(pathname)}` : ""
      router.replace(`/login${ret}`)
    }
  }, [router, pathname])

  if (!isLoggedIn()) return null
  return <>{children}</>
}
