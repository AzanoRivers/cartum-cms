'use client'

import { useEffect, useRef, useState } from 'react'
import { DocsSidebar } from './DocsSidebar'
import { DocsCodeBlock } from './DocsCodeBlock'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { Spinner } from '@/components/ui/atoms/Spinner'
import type { Dictionary } from '@/locales/en'

type DocsDict = Dictionary['cms']['docs']

export type DocsPageProps = {
  d:       DocsDict
  locale?: 'en' | 'es'
  noPad?:  boolean
}

// ── Section content components ────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-sm lg:text-base font-semibold text-text mb-3">{children}</h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-xs lg:text-sm font-semibold text-text/80 mb-1.5 mt-4">{children}</h3>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs lg:text-sm text-muted leading-5 lg:leading-6">{children}</p>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2 text-xs lg:text-sm text-muted leading-5 lg:leading-6 italic">
      {children}
    </div>
  )
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 pl-3">
      {items.map((item, i) => (
        <li key={i} className="text-xs lg:text-sm text-muted leading-5 lg:leading-6 flex gap-2">
          <span className="text-primary/60 shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-surface-2/60">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={[
                'border-b border-border last:border-0',
                i % 2 === 0 ? 'bg-surface-2/20' : '',
              ].join(' ')}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 font-mono text-[11px] text-text/80 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Section: Getting Started ──────────────────────────────────────────────────

function GettingStartedSection({ d, onSelect }: { d: DocsDict; onSelect: (id: SectionId) => void }) {
  const s = d.gettingStarted
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      {/* Welcome message */}
      <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-4 space-y-1">
        <p className="text-xs lg:text-sm text-text/80 leading-relaxed lg:leading-6 italic">{s.welcome}</p>
      </div>
      <Prose>{s.intro}</Prose>
      <div>
        <SubHeading>{s.conceptsTitle}</SubHeading>
        <UL items={Object.values(s.concepts)} />
      </div>
      <div>
        <SubHeading>{s.flowTitle}</SubHeading>
        <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2 font-mono text-xs text-primary">
          {s.flow}
        </div>
      </div>

      {/* Link to installation */}
      <button
        onClick={() => onSelect('installation')}
        className="group flex w-full items-center justify-between rounded-lg border border-border/60 bg-surface-2/20 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer text-left"
      >
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted group-hover:text-text transition-colors">{s.installLink}</p>
          <p className="font-mono text-[10px] text-primary/60 mt-0.5 group-hover:text-primary transition-colors">{d.sections.installation}</p>
        </div>
        <span className="shrink-0 text-muted group-hover:text-primary transition-colors ml-3">→</span>
      </button>
    </div>
  )
}

// ── Section: Navigation ───────────────────────────────────────────────────────

function NavigationSection({ d }: { d: DocsDict }) {
  const s = d.navigation
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <div>
        <SubHeading>{s.dockTitle}</SubHeading>
        <Prose>{s.dockDesc}</Prose>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-surface-2/40 p-3">
          <p className="font-mono text-xs font-semibold text-text mb-1">{s.boardLabel}</p>
          <p className="text-xs text-muted">{s.boardDesc}</p>
        </div>
        <div className="rounded-md border border-border bg-surface-2/40 p-3">
          <p className="font-mono text-xs font-semibold text-text mb-1">{s.contentLabel}</p>
          <p className="text-xs text-muted">{s.contentDesc}</p>
        </div>
      </div>
      <div>
        <SubHeading>{s.shortcutsTitle}</SubHeading>
        <Table
          headers={['Keys', 'Action']}
          rows={[
            ['G → H', s.shortcuts.goHome],
            ['G → C', s.shortcuts.goContent],
            ['G → N', s.shortcuts.newNode],
            ['G → ,', s.shortcuts.openSettings],
            ['Esc',   s.shortcuts.closeOverlay],
          ]}
        />
      </div>
      <div>
        <SubHeading>{s.gesturesTitle}</SubHeading>
        <Table
          headers={['Gesture', 'Action']}
          rows={[
            ['1×', s.gestures.singleTap],
            ['2×', s.gestures.doubleTap],
            ['⏱',  s.gestures.longPress],
            ['⟺', s.gestures.pinch],
            ['↕',  s.gestures.pan],
          ]}
        />
      </div>
    </div>
  )
}

// ── Section: Nodes & Fields ───────────────────────────────────────────────────

function NodesAndFieldsSection({ d }: { d: DocsDict }) {
  const s = d.nodesAndFields
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <div>
        <SubHeading>{s.deckTitle}</SubHeading>
        <Prose>{s.deckDesc}</Prose>
      </div>
      <div>
        <SubHeading>{s.cardAttrTitle}</SubHeading>
        <Prose>{s.cardAttrDesc}</Prose>
      </div>
      <div>
        <SubHeading>{s.attrTypesTitle}</SubHeading>
        <UL items={Object.values(s.attrTypes)} />
      </div>
      <Note>{s.note}</Note>
    </div>
  )
}

// ── Section: Nodes & Fields (Developer) ───────────────────────────────────────

// ── Section: Users & Roles ────────────────────────────────────────────────────

function UsersGuideSection({ d }: { d: DocsDict }) {
  const s = d.usersGuide
  const h = s.comparisonHeaders
  const rowCls = 'border-b border-border/40 last:border-0'
  const cellCls = 'px-3 py-2.5 font-mono text-xs text-text/80 leading-relaxed'
  const headCls = 'px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted bg-surface-2/60 text-left'
  return (
    <div className="space-y-6">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div className="h-px bg-border" />

      {/* Super admin */}
      <div className="space-y-3">
        <SubHeading>{s.superAdminTitle}</SubHeading>
        <Prose>{s.superAdminIntro}</Prose>
        <p className="font-mono text-xs font-semibold text-text/90">{s.superAdminHow}</p>
        <Prose>{s.superAdminHowDesc}</Prose>
        <Note>{s.superAdminNote}</Note>
      </div>

      <div className="h-px bg-border" />

      {/* Project admin */}
      <div className="space-y-3">
        <SubHeading>{s.adminTitle}</SubHeading>
        <Prose>{s.adminIntro}</Prose>
        <Note>{s.adminNote}</Note>
      </div>

      <div className="h-px bg-border" />

      {/* Comparison table */}
      <div className="space-y-3">
        <SubHeading>{s.comparisonTitle}</SubHeading>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className={headCls} style={{ width: '55%' }}>{h.feature}</th>
                <th className={`${headCls} text-center`} style={{ width: '22.5%' }}>{h.superAdmin}</th>
                <th className={`${headCls} text-center`} style={{ width: '22.5%' }}>{h.admin}</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(s.comparison).map((row, i) => (
                <tr key={i} className={rowCls}>
                  <td className={cellCls}>{row.feature}</td>
                  <td className={`${cellCls} text-center`}>
                    <span className={row.sa === 'Yes' || row.sa === 'Sí' ? 'text-success' : 'text-muted/60'}>
                      {row.sa}
                    </span>
                  </td>
                  <td className={`${cellCls} text-center`}>
                    <span className={
                      row.adm === 'No' ? 'text-muted/50' :
                      row.adm === 'Yes' || row.adm === 'Sí' ? 'text-success' :
                      'text-warning/80'
                    }>
                      {row.adm}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Local vs cloud */}
      <div className="space-y-3">
        <SubHeading>{s.localVsCloudTitle}</SubHeading>
        <UL items={Object.values(s.localVsCloudItems)} />
      </div>

      <Note>{s.securityNote}</Note>
    </div>
  )
}

// ── Section: Nodes & Fields (dev) ─────────────────────────────────────────────

function NodesAndFieldsDevSection({ d }: { d: DocsDict }) {
  const s = d.nodesAndFieldsDev
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div>
        <SubHeading>{s.nodeTitle}</SubHeading>
        <Prose>{s.nodeDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.fieldTitle}</SubHeading>
        <Prose>{s.fieldDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.fieldNamingTitle}</SubHeading>
        <Prose>{s.fieldNamingDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.fieldTypesTitle}</SubHeading>
        <UL items={Object.values(s.fieldTypes)} />
      </div>

      <div>
        <SubHeading>{s.requiredTitle}</SubHeading>
        <Prose>{s.requiredDesc}</Prose>
      </div>

      <Note>{s.note}</Note>
    </div>
  )
}

// ── Section: Content ──────────────────────────────────────────────────────────

function ContentSection({ d }: { d: DocsDict }) {
  const s = d.content
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <UL items={[s.step1, s.step2, s.newRecord, s.editRecord, s.deleteRecord]} />
      <Note>{s.validationNote}</Note>
      <Note>{s.mediaNote}</Note>
    </div>
  )
}

// ── Section: Web Migration (user-facing) ─────────────────────────────────────

function WebMigrationSection({ d }: { d: DocsDict }) {
  const s = d.webMigration
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div>
        <SubHeading>{s.howTitle}</SubHeading>
        <UL items={Object.values(s.howItems)} />
      </div>

      <div>
        <SubHeading>{s.whatYouGetTitle}</SubHeading>
        <UL items={Object.values(s.whatYouGetItems)} />
      </div>

      <Note>{s.aiNote}</Note>

      <div>
        <SubHeading>{s.bestForTitle}</SubHeading>
        <UL items={Object.values(s.bestForItems)} />
      </div>

      <div>
        <SubHeading>{s.startTitle}</SubHeading>
        <Prose>{s.startDesc}</Prose>
      </div>

      <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning/80 leading-5">
        ⚠ {s.accuracyWarning}
      </div>
    </div>
  )
}

// ── Section: Web Migration Dev ────────────────────────────────────────────────

function WebMigrationDevSection({ d }: { d: DocsDict }) {
  const s = d.webMigrationDev
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div>
        <SubHeading>{s.crawlTitle}</SubHeading>
        <Prose>{s.crawlDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.pipelineTitle}</SubHeading>
        <UL items={Object.values(s.pipelineItems)} />
      </div>

      <div>
        <SubHeading>{s.stackTitle}</SubHeading>
        <UL items={Object.values(s.stackItems)} />
      </div>

      <div>
        <SubHeading>{s.configTitle}</SubHeading>
        <Prose>{s.configDesc}</Prose>
      </div>

      <Note>{s.aiNote}</Note>

      <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning/80 leading-5">
        ⚠ {s.accuracyWarning}
      </div>

      <div>
        <SubHeading>{s.officialDocsTitle}</SubHeading>
        <Prose>{s.officialDocsDesc}</Prose>
        <div className="mt-2">
          <a
            href={s.officialDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <span>{s.officialDocsLink}</span>
            <span className="text-[10px] opacity-60">↗</span>
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Section: Relations Guide (client-facing) ──────────────────────────────────

function RelationsGuideSection({ d }: { d: DocsDict }) {
  const s = d.relationsGuide
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div>
        <SubHeading>{s.whatTitle}</SubHeading>
        <Prose>{s.whatDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.whyTitle}</SubHeading>
        <UL items={[s.whyItems.a, s.whyItems.b, s.whyItems.c]} />
      </div>

      <div>
        <SubHeading>{s.exampleTitle}</SubHeading>
        <Prose>{s.exampleDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.howTitle}</SubHeading>
        <UL items={[s.how1, s.how2, s.how3]} />
      </div>

      <div>
        <SubHeading>{s.contentTitle}</SubHeading>
        <Prose>{s.contentDesc}</Prose>
      </div>

      <Note>{s.note}</Note>
    </div>
  )
}

// ── Section: Media ────────────────────────────────────────────────────────────

function MediaSection({ d }: { d: DocsDict }) {
  const s = d.media
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <div>
        <SubHeading>{s.galleryTitle}</SubHeading>
        <Prose>{s.galleryDesc}</Prose>
      </div>
      <div>
        <SubHeading>{s.optimTitle}</SubHeading>
        <UL items={[s.optimImages, s.optimVideos, s.optimFallback]} />
      </div>
      <div>
        <SubHeading>{s.limitsTitle}</SubHeading>
        <UL items={[s.limitImages, s.limitVideos]} />
      </div>
      <Note>{s.configNote}</Note>
      <div>
        <SubHeading>{s.storageTitle}</SubHeading>
        <Prose>{s.storageIntro}</Prose>
        <div className="mt-2">
          <UL items={[s.storageR2, s.storageBlob]} />
        </div>
        <div className="mt-3">
          <SubHeading>{s.storageSwitchTitle}</SubHeading>
          <Prose>{s.storageSwitch}</Prose>
          <div className="mt-2">
            <Note>{s.storageBackcompat}</Note>
          </div>
        </div>
        <div className="mt-3">
          <SubHeading>{s.storageVideoLimitsTitle}</SubHeading>
          <div className="mt-2">
            <UL items={[s.storageVideoLimitsBlob, s.storageVideoLimitsR2]} />
          </div>
        </div>
      </div>
      <div>
        <SubHeading>{s.vpsTitle}</SubHeading>
        <Prose>{s.vpsIntro}</Prose>
        <div className="mt-2">
          <UL items={[s.vpsItem1, s.vpsItem2, s.vpsItem3, s.vpsItem4]} />
        </div>
        <div className="mt-2">
          <Note>{s.vpsTtlNote}</Note>
        </div>
      </div>
    </div>
  )
}

// ── Section: API for Devs ─────────────────────────────────────────────────────

function ApiForDevsSection({ d }: { d: DocsDict }) {
  const s = d.apiForDevs
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div>
        <SubHeading>{s.tokenTitle}</SubHeading>
        <UL items={[s.tokenStep1, s.tokenStep2, s.tokenStep3, s.tokenStep4, s.tokenStep5, s.tokenStep6]} />
      </div>

      <div>
        <SubHeading>{s.authTitle}</SubHeading>
        <DocsCodeBlock language="http" code="Authorization: Bearer <token>" />
        <p className="mt-1.5 text-xs text-muted">{s.authNote}</p>
      </div>

      <div>
        <SubHeading>{s.baseUrlTitle}</SubHeading>
        <DocsCodeBlock language="url" code="https://<your-domain>/api/v1/" />
      </div>

      <div>
        <SubHeading>{s.deckSlugTitle}</SubHeading>
        <Prose>{s.deckSlugDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.endpointsTitle}</SubHeading>
        <Table
          headers={['Method', 'Route', 'Description', 'Permission']}
          rows={[
            ['GET',    '/api/v1/table',                    s.endpoints.schema,         s.endpointPermissions.anyToken],
            ['GET',    '/api/v1/table/{deckId}',           s.endpoints.getSchemaDeck,  s.endpointPermissions.anyToken],
            ['GET',    '/api/v1/deck/{deckId}',            s.endpoints.getDeck,        s.endpointPermissions.read],
            ['GET',    '/api/v1/card/{cardId}',            s.endpoints.getCard,        s.endpointPermissions.anyToken],
            ['GET',    '/api/v1/{deckSlug}',               s.endpoints.listRecords,    s.endpointPermissions.read],
            ['GET',    '/api/v1/{deckSlug}/{id}',          s.endpoints.getRecord,      s.endpointPermissions.read],
            ['POST',   '/api/v1/{deckSlug}',               s.endpoints.createRecord,   s.endpointPermissions.write],
            ['PUT',    '/api/v1/{deckSlug}/{id}',          s.endpoints.putRecord,      s.endpointPermissions.update],
            ['PATCH',  '/api/v1/{deckSlug}/{id}',          s.endpoints.patchRecord,    s.endpointPermissions.update],
            ['DELETE', '/api/v1/{deckSlug}/{id}',          s.endpoints.deleteRecord,   s.endpointPermissions.delete],
          ]}
        />
        <div className="mt-2 space-y-1">
          <Note>{s.putVsPatchNote}</Note>
          <Note>{s.canvasNote}</Note>
        </div>
      </div>

      <div>
        <SubHeading>{s.queryParamsTitle}</SubHeading>
        <Table
          headers={['Param', 'Type', 'Default', 'Description']}
          rows={Object.values(s.params).map((p) => [p.name, p.type, p.default, p.desc])}
        />
      </div>

      <div>
        <SubHeading>{s.responseListTitle}</SubHeading>
        <DocsCodeBlock
          language="json"
          code={`{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Laptop Pro",
      "price": 1299,
      "featured": true,
      "createdAt": "2026-04-14T10:00:00Z",
      "updatedAt": "2026-04-14T12:00:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}`}
        />
      </div>

      <div>
        <SubHeading>{s.responseRecordTitle}</SubHeading>
        <DocsCodeBlock
          language="json"
          code={`{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Laptop Pro",
    "price": 1299,
    "featured": true,
    "createdAt": "2026-04-14T10:00:00Z",
    "updatedAt": "2026-04-14T12:00:00Z"
  }
}`}
        />
      </div>

      <div>
        <SubHeading>{s.includeTitle}</SubHeading>
        <Prose>{s.includeDesc}</Prose>
        <div className="mt-2">
          <DocsCodeBlock
            language="json"
            code={`{
  "data": {
    "id": "...",
    "name": "Laptop Pro",
    "category": {
      "id": "...",
      "name": "Electronics",
      "color": "#6366f1"
    }
  }
}`}
          />
        </div>
      </div>

      <div>
        <SubHeading>{s.errorsTitle}</SubHeading>
        <Table
          headers={['HTTP', 'Error', 'Description']}
          rows={Object.values(s.errors).map((e) => [e.code, e.name, e.desc])}
        />
      </div>

      <div>
        <SubHeading>{s.examplesTitle}</SubHeading>
        <Note>{s.examplesNote}</Note>
        <div className="mt-2">
          <DocsCodeBlock
            language="bash"
            code={`# List all decks on the table (root-level schema)
curl -H "Authorization: Bearer <token>" \\
  https://your-domain.com/api/v1/table

# Schema for a single deck by UUID
curl -H "Authorization: Bearer <token>" \\
  https://your-domain.com/api/v1/table/<deckId>

# List cards in a deck (paginated)
curl -H "Authorization: Bearer <token>" \\
  https://your-domain.com/api/v1/products

# Filter, paginate, sort
curl -H "Authorization: Bearer <token>" \\
  "https://your-domain.com/api/v1/products?page=2&limit=5&sort=price&order=asc&filter[featured]=true"

# Single record from a deck
curl -H "Authorization: Bearer <token>" \\
  https://your-domain.com/api/v1/products/550e8400-e29b-41d4-a716-446655440000

# Expand a relation field (linked deck)
curl -H "Authorization: Bearer <token>" \\
  "https://your-domain.com/api/v1/products/550e8400-e29b-41d4-a716-446655440000?include=category"

# Add a new record to a deck (write scope required)
curl -X POST \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Laptop Pro","price":1299,"featured":true}' \\
  https://your-domain.com/api/v1/products

# Partial update: only changed fields (update scope required)
curl -X PATCH \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"featured":false}' \\
  https://your-domain.com/api/v1/products/550e8400-e29b-41d4-a716-446655440000

# Delete a record (delete scope required)
curl -X DELETE \\
  -H "Authorization: Bearer <token>" \\
  https://your-domain.com/api/v1/products/550e8400-e29b-41d4-a716-446655440000`}
          />
        </div>
      </div>
    </div>
  )
}

// ── Section: Node Relations ───────────────────────────────────────────────────

function RelationsSection({ d }: { d: DocsDict }) {
  const s = d.relations
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      {/* Flat response principle */}
      <div>
        <SubHeading>{s.flatPrincipleTitle}</SubHeading>
        <Prose>{s.flatPrincipleDesc}</Prose>
      </div>

      {/* Structural inheritance */}
      <div>
        <SubHeading>{s.inheritanceTitle}</SubHeading>
        <Prose>{s.inheritanceDesc}</Prose>
      </div>

      {/* Relation types */}
      <div>
        <SubHeading>{s.relationTypesTitle}</SubHeading>
        <div className="space-y-2">
          {(['oneToOne', 'oneToMany', 'manyToMany'] as const).map((key) => (
            <div key={key} className="rounded-md border border-border bg-surface-2/40 p-3">
              <p className="font-mono text-xs font-semibold text-primary mb-1">
                {s.types[key].label}
              </p>
              <p className="text-xs text-muted leading-5">{s.types[key].desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Multiple relations */}
      <div>
        <SubHeading>{s.multipleRelationsTitle}</SubHeading>
        <Prose>{s.multipleRelationsDesc}</Prose>
      </div>

      {/* Anti-cycle */}
      <div>
        <SubHeading>{s.antiCycleTitle}</SubHeading>
        <Prose>{s.antiCycleDesc}</Prose>
      </div>

      {/* How to consume */}
      <div>
        <SubHeading>{s.consumingTitle}</SubHeading>
        <UL items={Object.values(s.consumingSteps)} />
      </div>

      {/* JSON example */}
      <div>
        <SubHeading>{s.exampleTitle}</SubHeading>
        <Note>{s.exampleNote}</Note>
        <div className="mt-2">
          <DocsCodeBlock
            language="json"
            code={`{
  "decks": [
    {
      "id": "a1b2c3d4-...",
      "name": "Blog Posts",
      "slug": "blog-posts",
      "updatedAt": "2026-04-15T10:00:00Z",
      "cards": [
        { "id": "f1...", "name": "title",          "type": "text", "required": true  },
        { "id": "f2...", "name": "body",            "type": "text", "required": true  },
        { "id": "f3...", "name": "metaTitle",       "type": "text", "required": false },
        { "id": "f4...", "name": "metaDescription", "type": "text", "required": false }
      ],
      "decks": [
        { "id": "seo-uuid-...", "name": "SEO", "slug": "seo", "updatedAt": "..." }
      ]
    }
  ]
}`}
          />
        </div>
      </div>
    </div>
  )
}

// ── Section: API Schema ───────────────────────────────────────────────────────

function ApiSchemaSection({ d }: { d: DocsDict }) {
  const s = d.apiSchema
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div>
        <SubHeading>{s.endpointLabel}</SubHeading>
        <DocsCodeBlock language="http" code={`GET /api/v1/table\nAuthorization: Bearer <token>`} />
        <p className="mt-1.5 text-xs text-muted">{s.anyTokenNote}</p>
      </div>

      <div>
        <SubHeading>{s.responseTitle}</SubHeading>
        <DocsCodeBlock
          language="json"
          code={`{
  "decks": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Products",
      "slug": "products",
      "updatedAt": "2026-04-15T10:00:00Z",
      "cards": [
        { "id": "f1e2d3c4-...", "name": "title",    "type": "text",     "required": true },
        { "id": "f2e3d4c5-...", "name": "price",    "type": "number",   "required": true },
        { "id": "f3e4d5c6-...", "name": "featured", "type": "boolean",  "required": false },
        { "id": "f4e5d6c7-...", "name": "cover",    "type": "image",    "required": false },
        { "id": "f5e6d7c8-...", "name": "category", "type": "relation", "required": false, "relatesTo": "categories" }
      ],
      "decks": []
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
      "name": "Categories",
      "slug": "categories",
      "updatedAt": "2026-04-15T09:00:00Z",
      "cards": [
        { "id": "f6e7d8c9-...", "name": "name",  "type": "text", "required": true },
        { "id": "f7e8d9c0-...", "name": "color", "type": "text", "required": false }
      ],
      "decks": []
    }
  ]
}`}
        />
      </div>

      <div>
        <SubHeading>{s.fieldsTableTitle}</SubHeading>
        <Table
          headers={['Field', 'Type', 'Description']}
          rows={Object.values(s.fields).map((f) => [f.name, f.type, f.desc])}
        />
      </div>

      <div>
        <SubHeading>{s.exampleLabel}</SubHeading>
        <DocsCodeBlock
          language="bash"
          code={`curl -H "Authorization: Bearer <token>" \\\n  https://your-domain.com/api/v1/table`}
        />
      </div>
    </div>
  )
}

// ── Section: Roles Guide ─────────────────────────────────────────────────────

function RolesGuideSection({ d }: { d: DocsDict }) {
  const s = d.rolesGuide

  const ROLE_COLORS: Record<string, string> = {
    admin:      'border-primary/40 bg-primary/10 text-primary',
    editor:     'border-accent/40 bg-accent/10 text-accent',
    viewer:     'border-border bg-surface-2/60 text-muted',
    restricted: 'border-danger/30 bg-danger/5 text-danger/80',
  }

  return (
    <div className="space-y-5">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div>
        <SubHeading>{s.defaultRolesTitle}</SubHeading>
        <div className="space-y-3 mt-2">
          {(['admin', 'editor', 'viewer', 'restricted'] as const).map((key) => {
            const role = s.roles[key]
            return (
              <div key={key} className={`rounded-md border p-3 ${ROLE_COLORS[key]}`}>
                <p className="font-mono text-xs font-semibold mb-1">{role.name}</p>
                <p className="text-xs leading-5 opacity-80">{role.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <SubHeading>{s.projectScopeTitle}</SubHeading>
        <Prose>{s.projectScopeDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.newProjectTitle}</SubHeading>
        <Prose>{s.newProjectDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.inviteTitle}</SubHeading>
        <Prose>{s.inviteDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.superAdminTitle}</SubHeading>
        <Prose>{s.superAdminDesc}</Prose>
      </div>

      <Note>{s.switchNote}</Note>
    </div>
  )
}

// ── Section: Multi-Project (user-facing) ─────────────────────────────────────

function MultiProjectSection({ d }: { d: DocsDict }) {
  const s = d.multiProject
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div>
        <SubHeading>{s.tableTitle}</SubHeading>
        <Prose>{s.tableDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.switchTitle}</SubHeading>
        <Prose>{s.switchDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.newTableTitle}</SubHeading>
        <Prose>{s.newTableDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.playersTitle}</SubHeading>
        <Prose>{s.playersDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.languageTitle}</SubHeading>
        <Prose>{s.languageDesc}</Prose>
      </div>

      <Note>{s.note}</Note>
    </div>
  )
}

// ── Section: Multi-Project (developer) ───────────────────────────────────────

function MultiProjectDevSection({ d }: { d: DocsDict }) {
  const s = d.multiProjectDev
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div>
        <SubHeading>{s.capsuleTitle}</SubHeading>
        <Prose>{s.capsuleDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.sessionTitle}</SubHeading>
        <Prose>{s.sessionDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.localeTitle}</SubHeading>
        <Prose>{s.localeDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.superAdminTitle}</SubHeading>
        <UL items={Object.values(s.superAdminItems)} />
      </div>

      <div>
        <SubHeading>{s.regularAdminTitle}</SubHeading>
        <UL items={Object.values(s.regularAdminItems)} />
      </div>

      <div>
        <SubHeading>{s.apiKeysTitle}</SubHeading>
        <Prose>{s.apiKeysDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.storageTitle}</SubHeading>
        <Table
          headers={s.storageHeaders as [string, string, string]}
          rows={[
            s.storageR2 as [string, string, string],
            s.storageBlob as [string, string, string],
          ]}
        />
      </div>

      <Note>{s.setupNote}</Note>
    </div>
  )
}

// ── Section: Installation ─────────────────────────────────────────────────────

function InstallationSection({ d }: { d: DocsDict }) {
  const s = d.installation
  return (
    <div className="space-y-6">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      {/* Prerequisites */}
      <div>
        <SubHeading>{s.prereqTitle}</SubHeading>
        <UL items={Object.values(s.prereqs)} />
      </div>

      {/* Quick install */}
      <div className="space-y-3">
        <SubHeading>{s.quickTitle}</SubHeading>
        <Prose>{s.quickDesc}</Prose>
        <DocsCodeBlock
          language="bash"
          code={`pnpm create cartum-cms\n# or\nnpx create-cartum-cms\n# or\nyarn create cartum-cms`}
        />
        <p className="text-xs lg:text-sm text-muted">{s.quickThenTitle}</p>
        <DocsCodeBlock
          language="bash"
          code={`cd your-project\npnpm db:migrate\npnpm dev`}
        />
      </div>

      <div className="h-px bg-border" />

      {/* Manual install */}
      <div className="space-y-3">
        <SubHeading>{s.manualTitle}</SubHeading>
        <UL items={Object.values(s.manualSteps)} />
        <DocsCodeBlock
          language="bash"
          code={`# 1. Clone\ngit clone https://github.com/azanoRivers/cartum-cms.git\n\n# 2. Install\ncd cartum-cms && pnpm install\n\n# 3. Environment\ncp .env.example .env\n\n# 4. Edit .env with your values, then:\n\n# 5. Migrate\npnpm db:migrate\n\n# 6. Start\npnpm dev`}
        />
      </div>

      <div className="h-px bg-border" />

      {/* Environment variables */}
      <div className="space-y-4">
        <SubHeading>{s.envTitle}</SubHeading>
        <div>
          <p className="font-mono text-[10px] lg:text-xs uppercase tracking-widest text-muted mb-2">{s.envRequired}</p>
          <UL items={[
            s.envVars.dbUrl,
            s.envVars.dbProvider,
            s.envVars.authSecret,
            s.envVars.authUrl,
            s.envVars.nodeEnv,
          ]} />
        </div>
        <div>
          <p className="font-mono text-[10px] lg:text-xs uppercase tracking-widest text-muted mb-2">{s.envOptional}</p>
          <UL items={[
            s.envVars.r2,
            s.envVars.blob,
            s.envVars.resend,
            s.envVars.vps,
          ]} />
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Scripts */}
      <div>
        <SubHeading>{s.scriptsTitle}</SubHeading>
        <UL items={Object.values(s.scripts)} />
      </div>

      {/* Repo link */}
      <div className="flex items-center gap-2">
        <a
          href="https://github.com/azanoRivers/cartum-cms"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <span>{s.repoNote} ↗</span>
        </a>
      </div>
    </div>
  )
}

// ── Section: Storage Setup ────────────────────────────────────────────────────

// ── Section: Email Setup ──────────────────────────────────────────────────────

function EmailSetupSection({ d }: { d: DocsDict }) {
  const s = d.emailSetup
  const linkCls = 'inline-flex items-center gap-1 font-mono text-xs text-primary hover:text-primary/80 transition-colors'
  return (
    <div className="space-y-6">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      <div className="space-y-2">
        <SubHeading>{s.howTitle}</SubHeading>
        <UL items={Object.values(s.howItems)} />
      </div>

      <div className="h-px bg-border" />

      {/* Resend */}
      <div className="space-y-4">
        <SubHeading>{s.resendTitle}</SubHeading>
        <Prose>{s.resendIntro}</Prose>
        <UL items={Object.values(s.resendSteps)} />
        <SubHeading>{s.resendEnvTitle}</SubHeading>
        <DocsCodeBlock language="env" code={Object.values(s.resendEnvVars).join('\n')} />
        <Note>{s.resendNote}</Note>
        <a href="https://resend.com/docs" target="_blank" rel="noopener noreferrer" className={linkCls}>
          {s.docsLink}
        </a>
      </div>

      <div className="h-px bg-border" />

      {/* AWS SES */}
      <div className="space-y-4">
        <SubHeading>{s.sesTitle}</SubHeading>
        <Prose>{s.sesIntro}</Prose>
        <UL items={Object.values(s.sesSteps)} />
        <SubHeading>{s.sesEnvTitle}</SubHeading>
        <DocsCodeBlock language="env" code={Object.values(s.sesEnvVars).join('\n')} />
        <Note>{s.sesNote}</Note>
        <a href="https://docs.aws.amazon.com/ses/latest/dg/setting-up.html" target="_blank" rel="noopener noreferrer" className={linkCls}>
          {s.docsLinkSes}
        </a>
      </div>

      <div className="h-px bg-border" />

      {/* UI configuration */}
      <div className="space-y-2">
        <SubHeading>{s.uiTitle}</SubHeading>
        <Prose>{s.uiIntro}</Prose>
        <UL items={Object.values(s.uiItems)} />
      </div>

      <Note>{s.scopeNote}</Note>
    </div>
  )
}

// ── Section: Storage Setup ────────────────────────────────────────────────────

function StorageSetupSection({ d }: { d: DocsDict }) {
  const s = d.storageSetup
  return (
    <div className="space-y-6">
      <SectionHeading>{s.title}</SectionHeading>
      <Prose>{s.intro}</Prose>

      {/* ── Cloudflare R2 ── */}
      <div className="space-y-4">
        <SubHeading>{s.r2Title}</SubHeading>
        <Prose>{s.r2Intro}</Prose>
        <UL items={Object.values(s.r2Steps)} />

        <SubHeading>{s.r2EnvTitle}</SubHeading>
        <DocsCodeBlock
          language="env"
          code={Object.values(s.r2EnvVars).join('\n')}
        />

        <SubHeading>{s.r2CorsTitle}</SubHeading>
        <Note>{s.r2CorsNote}</Note>

        <div className="flex items-center gap-2">
          <a
            href="https://developers.cloudflare.com/r2/get-started/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <span>Cloudflare R2 Dashboard ↗</span>
          </a>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* ── Vercel Blob ── */}
      <div className="space-y-4">
        <SubHeading>{s.blobTitle}</SubHeading>
        <Prose>{s.blobIntro}</Prose>
        <UL items={Object.values(s.blobSteps)} />

        <SubHeading>{s.blobEnvTitle}</SubHeading>
        <DocsCodeBlock language="env" code={s.blobEnvVar} />

        <div className="flex items-center gap-2">
          <a
            href="https://vercel.com/docs/storage/vercel-blob"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <span>Vercel Dashboard ↗</span>
          </a>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Switching providers */}
      <div className="space-y-3">
        <SubHeading>{s.switchTitle}</SubHeading>
        <Prose>{s.switchIntro}</Prose>
        <UL items={Object.values(s.switchItems)} />
      </div>

      <div className="h-px bg-border" />

      {/* Fallback chain */}
      <div className="space-y-3">
        <SubHeading>{s.fallbackTitle}</SubHeading>
        <Prose>{s.fallbackIntro}</Prose>
        <UL items={Object.values(s.fallbackItems)} />
      </div>

      <div className="h-px bg-border" />

      {/* CMS-wide default */}
      <div className="space-y-3">
        <SubHeading>{s.defaultsTitle}</SubHeading>
        <Prose>{s.defaultsIntro}</Prose>
      </div>

      <Note>{s.scopeNote}</Note>
    </div>
  )
}

// ── Section nav ───────────────────────────────────────────────────────────────

const ORDERED_SECTIONS = [
  'gettingStarted','navigation','nodesAndFields','content','webMigration',
  'relationsGuide','rolesGuide','multiProject',
  'installation','usersGuide','nodesAndFieldsDev','emailSetup','webMigrationDev','multiProjectDev','media',
  'storageSetup','apiForDevs','apiSchema','relations',
] as const

const DEV_SECTION_SET = new Set([
  'installation','usersGuide','nodesAndFieldsDev','emailSetup','webMigrationDev','multiProjectDev','media',
  'storageSetup','apiForDevs','apiSchema','relations',
])

function SectionNav({
  activeId,
  d,
  onSelect,
}: {
  activeId: string
  d:        DocsDict
  onSelect: (id: string) => void
}) {
  const idx  = ORDERED_SECTIONS.indexOf(activeId as typeof ORDERED_SECTIONS[number])
  const prev = idx > 0 ? ORDERED_SECTIONS[idx - 1] : null
  const next = idx < ORDERED_SECTIONS.length - 1 ? ORDERED_SECTIONS[idx + 1] : null

  if (!prev && !next) return null

  function NavBtn({ id, dir }: { id: string; dir: 'prev' | 'next' }) {
    const isDev  = DEV_SECTION_SET.has(id)
    const label  = d.sections[id as keyof typeof d.sections] ?? id
    const badge  = isDev ? d.devBadge : d.userBadge
    return (
      <button
        onClick={() => onSelect(id)}
        className={[
          'group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/60 px-3 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5 cursor-pointer',
          dir === 'next' ? 'justify-end text-right' : 'text-left',
        ].join(' ')}
      >
        {dir === 'prev' && <span className="shrink-0 text-muted group-hover:text-primary transition-colors">←</span>}
        <div className="min-w-0 flex flex-wrap items-center gap-1.5">
          {dir === 'next' && (
            <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none font-medium ${isDev ? 'border-accent/40 bg-accent/10 text-accent' : 'border-primary/40 bg-primary/10 text-primary'}`}>
              {badge}
            </span>
          )}
          <span className="font-mono text-xs text-muted group-hover:text-text transition-colors leading-snug">{label}</span>
          {dir === 'prev' && (
            <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none font-medium ${isDev ? 'border-accent/40 bg-accent/10 text-accent' : 'border-primary/40 bg-primary/10 text-primary'}`}>
              {badge}
            </span>
          )}
        </div>
        {dir === 'next' && <span className="shrink-0 text-muted group-hover:text-primary transition-colors">→</span>}
      </button>
    )
  }

  return (
    <div className="mt-10 flex items-stretch gap-2 border-t border-border/50 pt-5">
      {prev ? <NavBtn id={prev} dir="prev" /> : <div className="flex-1" />}
      {next ? <NavBtn id={next} dir="next" /> : <div className="flex-1" />}
    </div>
  )
}

// ── Section registry ──────────────────────────────────────────────────────────

type SectionId =
  | 'gettingStarted'
  | 'navigation'
  | 'nodesAndFields'
  | 'content'
  | 'webMigration'
  | 'relationsGuide'
  | 'rolesGuide'
  | 'multiProject'
  | 'installation'
  | 'usersGuide'
  | 'nodesAndFieldsDev'
  | 'emailSetup'
  | 'webMigrationDev'
  | 'multiProjectDev'
  | 'media'
  | 'storageSetup'
  | 'apiForDevs'
  | 'apiSchema'
  | 'relations'

// ── Valid section IDs (for hash validation) ───────────────────────────────────

const VALID_SECTION_IDS = new Set<string>([
  'gettingStarted', 'navigation', 'nodesAndFields', 'content', 'webMigration',
  'relationsGuide', 'rolesGuide', 'multiProject', 'nodesAndFieldsDev', 'usersGuide', 'emailSetup', 'webMigrationDev',
  'multiProjectDev', 'media', 'installation', 'storageSetup', 'apiForDevs', 'apiSchema', 'relations',
])

// ── Main Page ─────────────────────────────────────────────────────────────────

export function DocsPage({ d, locale, noPad = false }: DocsPageProps) {
  const showLang = !!locale
  const [activeId, setActiveId]   = useState<SectionId>('gettingStarted')
  const [resolving, setResolving] = useState(true)
  const mainRef = useRef<HTMLElement | null>(null)

  // Scroll to top after section changes
  useEffect(() => {
    requestAnimationFrame(() => {
      if (mainRef.current) mainRef.current.scrollTop = 0
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
  }, [activeId])

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (VALID_SECTION_IDS.has(hash)) setActiveId(hash as SectionId)
    setResolving(false)

    function syncFromHash() {
      const h = window.location.hash.slice(1)
      if (VALID_SECTION_IDS.has(h)) setActiveId(h as SectionId)
    }

    // hashchange fires on anchor clicks; popstate fires on pushState back/forward
    window.addEventListener('hashchange', syncFromHash)
    window.addEventListener('popstate', syncFromHash)
    return () => {
      window.removeEventListener('hashchange', syncFromHash)
      window.removeEventListener('popstate', syncFromHash)
    }
  }, [])

  function selectSection(id: SectionId) {
    setActiveId(id)
    history.pushState(null, '', `#${id}`)
  }

  function renderSection() {
    switch (activeId) {
      case 'gettingStarted':  return <GettingStartedSection d={d} onSelect={selectSection} />
      case 'navigation':      return <NavigationSection d={d} />
      case 'nodesAndFields':  return <NodesAndFieldsSection d={d} />
      case 'content':         return <ContentSection d={d} />
      case 'webMigration':    return <WebMigrationSection d={d} />
      case 'relationsGuide':     return <RelationsGuideSection d={d} />
      case 'rolesGuide':         return <RolesGuideSection d={d} />
      case 'multiProject':       return <MultiProjectSection d={d} />
      case 'usersGuide':         return <UsersGuideSection d={d} />
      case 'nodesAndFieldsDev':  return <NodesAndFieldsDevSection d={d} />
      case 'emailSetup':         return <EmailSetupSection d={d} />
      case 'webMigrationDev':    return <WebMigrationDevSection d={d} />
      case 'multiProjectDev':    return <MultiProjectDevSection d={d} />
      case 'media':              return <MediaSection d={d} />
      case 'installation':    return <InstallationSection d={d} />
      case 'storageSetup':    return <StorageSetupSection d={d} />
      case 'apiForDevs':      return <ApiForDevsSection d={d} />
      case 'apiSchema':       return <ApiSchemaSection d={d} />
      case 'relations':       return <RelationsSection d={d} />
    }
  }

  return (
    <div className={`flex flex-1 flex-col overflow-hidden md:flex-row ${noPad ? '' : 'pt-9 md:pt-0'}`}>
      <DocsSidebar
        sections={d.sections}
        activeId={activeId}
        onSelect={(id) => selectSection(id as SectionId)}
        showLang={showLang}
        currentLocale={locale ?? 'en'}
      />

      {/* Content area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-bg">
        {resolving ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center">
                <span className="absolute h-10 w-10 rounded-full bg-primary/10 blur-md" aria-hidden="true" />
                <Spinner size="lg" color="primary" />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted/50 animate-pulse select-none">
                {d.title}
              </span>
            </div>
          </div>
        ) : (
          <VHSTransition duration="normal" trigger={activeId}>
            <div className="mx-auto max-w-2xl lg:max-w-3xl px-6 lg:px-10 pt-8 pb-28 md:pb-32">
              {renderSection()}
              <SectionNav activeId={activeId} d={d} onSelect={(id) => selectSection(id as SectionId)} />
            </div>
          </VHSTransition>
        )}
      </main>

      {/* Floating footer — mobile: centered bottom; desktop: bottom-right */}
      <div
        className="flex fixed bottom-3 z-40 pointer-events-none flex-col items-center gap-1.5 w-[calc(100%-2rem)] left-1/2 -translate-x-1/2 md:w-auto md:left-auto md:right-4 md:translate-x-0 md:items-end"
        aria-hidden="true"
      >
        {/* Line 1 — exact same as BrandFooter */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/50 bg-surface px-4 py-1.5">
          <span className="font-mono text-xs text-muted/80 tracking-wide select-none">by</span>
          <a
            href="https://azanorivers.com"
            target="_blank"
            rel="noopener noreferrer"
            className="brand-link font-mono text-xs tracking-wide text-muted transition-colors duration-300 hover:text-accent"
          >
            <span className="brand-glow">AzanoRivers</span>
          </a>
          <span className="font-mono text-xs text-muted/50 select-none">·</span>
          <a
            href="https://azanolabs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="brand-link font-mono text-xs tracking-wide text-muted transition-colors duration-300 hover:text-primary"
          >
            <span className="brand-glow-primary">AzanoLabs</span>
          </a>
          <span className="font-mono text-xs text-muted/30 select-none">·</span>
          <span className="cartum-neon-rainbow font-mono text-xs tracking-wide select-none font-semibold">CARTUM CMS</span>
        </div>

        {/* Line 2 — GitHub + X centered */}
        <div className="pointer-events-auto flex items-center justify-center gap-3 rounded-full border border-border/50 bg-surface px-4 py-1.5 w-full">
          <a
            href="https://github.com/AzanoRivers/cartum-cms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-mono text-[11px] text-muted hover:text-text transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
          <span className="font-mono text-[11px] text-muted/30 select-none">·</span>
          <a
            href="https://x.com/azanorivers"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-mono text-[11px] text-muted hover:text-text transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            AzanoRivers
          </a>
        </div>
      </div>
    </div>
  )
}
