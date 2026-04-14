export default function DocsLayout({ children }: { children: React.ReactNode }) {
  // The /cms/ parent layout already renders TopBar, SettingsPanel, HelpPanel,
  // and authentication. This layout only wraps the content area — no DockBar.
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {children}
    </div>
  )
}
