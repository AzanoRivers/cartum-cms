'use client'

import { useState } from 'react'
import { DocsSidebar } from './DocsSidebar'
import { DocsCodeBlock } from './DocsCodeBlock'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'

type DocsDict = Dictionary['cms']['docs']

export type DocsPageProps = {
  d: DocsDict
}

// ── Section content components ────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-sm font-semibold text-text mb-3">{children}</h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-xs font-semibold text-text/80 mb-1.5 mt-4">{children}</h3>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted leading-5">{children}</p>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted leading-5 italic">
      {children}
    </div>
  )
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 pl-3">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-muted leading-5 flex gap-2">
          <span className="text-primary/60 shrink-0">—</span>
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

function GettingStartedSection({ d }: { d: DocsDict }) {
  const s = d.gettingStarted
  return (
    <div className="space-y-4">
      <SectionHeading>{s.title}</SectionHeading>
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
        <UL items={[s.tokenStep1, s.tokenStep2, s.tokenStep3, s.tokenStep4, s.tokenStep5]} />
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
        <SubHeading>{s.nodeNameTitle.replace('{nodeName}', '{nodeName}')}</SubHeading>
        <Prose>{s.nodeNameDesc}</Prose>
      </div>

      <div>
        <SubHeading>{s.endpointsTitle}</SubHeading>
        <Table
          headers={['Method', 'Route', 'Description', 'Permission']}
          rows={[
            ['GET',    '/api/v1/schema',               s.endpoints.schema,      s.endpointPermissions.anyToken],
            ['GET',    '/api/v1/nodes/{nodeId}',        s.endpoints.getNode,     s.endpointPermissions.anyToken],
            ['GET',    '/api/v1/fields/{fieldId}',      s.endpoints.getField,    s.endpointPermissions.anyToken],
            ['GET',    '/api/v1/{nodeName}',            s.endpoints.listRecords, s.endpointPermissions.read],
            ['GET',    '/api/v1/{nodeName}/{id}',       s.endpoints.getRecord,   s.endpointPermissions.read],
            ['POST',   '/api/v1/{nodeName}',            s.endpoints.createRecord,s.endpointPermissions.create],
            ['PUT',    '/api/v1/{nodeName}/{id}',       s.endpoints.putRecord,   s.endpointPermissions.update],
            ['PATCH',  '/api/v1/{nodeName}/{id}',       s.endpoints.patchRecord, s.endpointPermissions.update],
            ['DELETE', '/api/v1/{nodeName}/{id}',       s.endpoints.deleteRecord,s.endpointPermissions.delete],
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
            code={`# Discover schema
curl -H "Authorization: Bearer <token>" \\
  https://your-domain.com/api/v1/schema

# List records
curl -H "Authorization: Bearer <token>" \\
  https://your-domain.com/api/v1/products

# Page 2, 5 per page, sort by price ascending
curl -H "Authorization: Bearer <token>" \\
  "https://your-domain.com/api/v1/products?page=2&limit=5&sort=price&order=asc"

# Single record
curl -H "Authorization: Bearer <token>" \\
  https://your-domain.com/api/v1/products/550e8400-e29b-41d4-a716-446655440000

# Expand relation
curl -H "Authorization: Bearer <token>" \\
  "https://your-domain.com/api/v1/products/550e8400-e29b-41d4-a716-446655440000?include=category"

# Create
curl -X POST \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Laptop Pro","price":1299,"featured":true}' \\
  https://your-domain.com/api/v1/products

# Partial update (PATCH)
curl -X PATCH \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"featured":false}' \\
  https://your-domain.com/api/v1/products/550e8400-e29b-41d4-a716-446655440000

# Delete
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
  "nodes": [
    {
      "id": "a1b2c3d4-...",
      "name": "Blog Posts",
      "slug": "blog-posts",
      "edit": "2026-04-15T10:00:00Z",
      "fields": [
        { "id": "f1...", "name": "title",           "type": "text", "required": true,  "edit": "..." },
        { "id": "f2...", "name": "body",             "type": "text", "required": true,  "edit": "..." },
        { "id": "f3...", "name": "metaTitle",        "type": "text", "required": false, "edit": "..." },
        { "id": "f4...", "name": "metaDescription",  "type": "text", "required": false, "edit": "..." }
      ],
      "containers": [
        { "id": "seo-uuid-...", "name": "SEO", "edit": "..." }
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
        <DocsCodeBlock language="http" code={`GET /api/v1/schema\nAuthorization: Bearer <token>`} />
        <p className="mt-1.5 text-xs text-muted">{s.anyTokenNote}</p>
      </div>

      <div>
        <SubHeading>{s.responseTitle}</SubHeading>
        <DocsCodeBlock
          language="json"
          code={`{
  "nodes": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Products",
      "slug": "products",
      "fields": [
        { "id": "f1e2d3c4-b5a6-7890-abcd-ef1234567890", "name": "title",    "type": "text",     "required": true },
        { "id": "f2e3d4c5-b6a7-8901-bcde-f01234567891", "name": "price",    "type": "number",   "required": true },
        { "id": "f3e4d5c6-b7a8-9012-cdef-012345678912", "name": "featured", "type": "boolean",  "required": false },
        { "id": "f4e5d6c7-b8a9-0123-def0-123456789023", "name": "cover",    "type": "image",    "required": false },
        { "id": "f5e6d7c8-b9a0-1234-ef01-234567890134", "name": "category", "type": "relation", "required": false, "relatesTo": "categories" }
      ]
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
      "name": "Categories",
      "slug": "categories",
      "fields": [
        { "id": "f6e7d8c9-b0a1-2345-f012-345678901245", "name": "name",  "type": "text", "required": true },
        { "id": "f7e8d9c0-b1a2-3456-0123-456789012356", "name": "color", "type": "text", "required": false }
      ]
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
          code={`curl -H "Authorization: Bearer <token>" \\\n  https://your-domain.com/api/v1/schema`}
        />
      </div>
    </div>
  )
}

// ── Section registry ──────────────────────────────────────────────────────────

type SectionId =
  | 'gettingStarted'
  | 'navigation'
  | 'nodesAndFields'
  | 'content'
  | 'relationsGuide'
  | 'nodesAndFieldsDev'
  | 'media'
  | 'apiForDevs'
  | 'apiSchema'
  | 'relations'

// ── Main Page ─────────────────────────────────────────────────────────────────

export function DocsPage({ d }: DocsPageProps) {
  const [activeId, setActiveId] = useState<SectionId>('gettingStarted')

  function renderSection() {
    switch (activeId) {
      case 'gettingStarted': return <GettingStartedSection d={d} />
      case 'navigation':     return <NavigationSection d={d} />
      case 'nodesAndFields': return <NodesAndFieldsSection d={d} />
      case 'content':        return <ContentSection d={d} />
      case 'relationsGuide':    return <RelationsGuideSection d={d} />
      case 'nodesAndFieldsDev': return <NodesAndFieldsDevSection d={d} />
      case 'media':             return <MediaSection d={d} />
      case 'apiForDevs':     return <ApiForDevsSection d={d} />
      case 'apiSchema':      return <ApiSchemaSection d={d} />
      case 'relations':      return <RelationsSection d={d} />
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden pt-9 md:flex-row md:pt-0">
      <DocsSidebar
        sections={d.sections}
        activeId={activeId}
        onSelect={(id) => setActiveId(id as SectionId)}
      />

      {/* Content area */}
      <main className="flex-1 overflow-y-auto bg-bg">
        <VHSTransition duration="normal" trigger={activeId}>
          <div className="mx-auto max-w-2xl px-6 py-8">
            {renderSection()}
          </div>
        </VHSTransition>
      </main>
    </div>
  )
}
