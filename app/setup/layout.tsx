import type { Metadata } from 'next'
import { ClearSwitchOverlay } from '@/components/ui/atoms/ClearSwitchOverlay'

export const metadata: Metadata = {
  title: 'Setup',
}

export default function SetupRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ClearSwitchOverlay />
      {children}
    </>
  )
}
