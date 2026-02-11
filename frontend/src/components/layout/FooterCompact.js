import { Sparkles } from 'lucide-react'
import React from 'react'
import Link from 'next/link'

const FooterCompact = () => {
  return (
    <div className="px-6 md:px-10 py-6 border-t border-border mt-8 bg-background/50 backdrop-blur-sm">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <Link href={"/"} className="flex items-center gap-2 group">
          <div className="bg-gradient-to-br from-primary to-accent rounded-xl p-2 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">ProConnect</span>
        </Link>

        <div className="flex gap-6">
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Help</Link>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} ProConnect. Creative Network Platform.
        </p>
      </div>
    </div>
  )
}

export default FooterCompact