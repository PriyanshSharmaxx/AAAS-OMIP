# Omip - Project Codebase Mapping

This document provides a comprehensive mapping of the Omip codebase to help new editors or AI models understand the project structure.

## Tech Stack (Frontend)
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Components**: shadcn/ui
- **Dependencies**: @number-flow/react, @radix-ui/react-avatar, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-label, @radix-ui/react-popover, @radix-ui/react-select, @radix-ui/react-separator, @radix-ui/react-slot, @radix-ui/react-switch, @radix-ui/react-tabs, @radix-ui/react-toast, @tanstack/react-query, class-variance-authority, clsx, framer-motion, lucide-react, next, next-themes, react, react-dom, tailwind-merge, tw-animate-css, zustand

## Directory Structure

```
omip/
├── backend-node/
│   ├── logs/
│   │   ├── combined.log
│   │   └── error.log
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── adapters/
│   │   │   ├── groq.adapter.ts
│   │   │   ├── index.ts
│   │   │   ├── langchain.adapter.ts
│   │   │   ├── multiagent.adapter.ts
│   │   │   ├── n8n.adapter.ts
│   │   │   ├── python.adapter.ts
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   ├── agents/
│   │   │   │   ├── agents.controller.ts
│   │   │   │   ├── agents.http
│   │   │   │   ├── agents.routes.ts
│   │   │   │   ├── download.controller.ts
│   │   │   │   ├── execution.controller.ts
│   │   │   │   ├── execution.http
│   │   │   │   └── queue.http
│   │   │   ├── apis/
│   │   │   │   ├── apis.controller.ts
│   │   │   │   └── apis.routes.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.http
│   │   │   │   └── auth.routes.ts
│   │   │   ├── llm/
│   │   │   │   ├── llm.http
│   │   │   │   └── llm.routes.ts
│   │   │   ├── marketplace/
│   │   │   │   ├── marketplace.controller.ts
│   │   │   │   ├── marketplace.http
│   │   │   │   └── marketplace.routes.ts
│   │   │   ├── notifications/
│   │   │   │   ├── notifications.controller.ts
│   │   │   │   ├── notifications.http
│   │   │   │   └── notifications.routes.ts
│   │   │   ├── permissions/
│   │   │   │   ├── permissions.controller.ts
│   │   │   │   ├── permissions.http
│   │   │   │   └── permissions.routes.ts
│   │   │   ├── schedule/
│   │   │   │   ├── schedule.controller.ts
│   │   │   │   ├── schedule.http
│   │   │   │   └── schedule.routes.ts
│   │   │   ├── stats/
│   │   │   │   ├── stats.controller.ts
│   │   │   │   ├── stats.http
│   │   │   │   └── stats.routes.ts
│   │   │   ├── teams/
│   │   │   │   ├── teams.controller.ts
│   │   │   │   ├── teams.http
│   │   │   │   └── teams.routes.ts
│   │   │   ├── tools/
│   │   │   │   ├── tools.controller.ts
│   │   │   │   ├── tools.http
│   │   │   │   └── tools.routes.ts
│   │   │   ├── user/
│   │   │   │   ├── user.controller.ts
│   │   │   │   └── user.routes.ts
│   │   │   ├── versioning/
│   │   │   │   ├── versioning.controller.ts
│   │   │   │   ├── versioning.http
│   │   │   │   └── versioning.routes.ts
│   │   │   └── workflows/
│   │   │       ├── workflows.controller.ts
│   │   │       ├── workflows.http
│   │   │       └── workflows.routes.ts
│   │   ├── lib/
│   │   │   ├── llm/
│   │   │   │   ├── anthropic.client.ts
│   │   │   │   ├── groq.client.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── openai.client.ts
│   │   │   │   └── types.ts
│   │   │   ├── config.ts
│   │   │   ├── db.ts
│   │   │   ├── jwt.ts
│   │   │   ├── logger.ts
│   │   │   ├── prisma.ts
│   │   │   ├── redis.ts
│   │   │   └── zip.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── services/
│   │   │   ├── pricing/
│   │   │   │   └── cost.service.ts
│   │   │   ├── tools/
│   │   │   │   ├── api.tool.ts
│   │   │   │   ├── database.tool.ts
│   │   │   │   ├── file.tool.ts
│   │   │   │   ├── github.tool.ts
│   │   │   │   ├── gmail.tool.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── search.tool.ts
│   │   │   │   ├── slack.tool.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── utility.tool.ts
│   │   │   ├── agentExecutor.ts
│   │   │   ├── agents.service.ts
│   │   │   ├── apis.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── execution.service.ts
│   │   │   ├── marketplace.service.ts
│   │   │   ├── mcpLoader.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── permission.service.ts
│   │   │   ├── scheduler.service.ts
│   │   │   ├── stats.service.ts
│   │   │   ├── team.service.ts
│   │   │   ├── toolRegistry.ts
│   │   │   ├── versioning.service.ts
│   │   │   └── workflow.service.ts
│   │   ├── utils/
│   │   │   └── agentMapper.ts
│   │   ├── workers/
│   │   │   ├── index.ts
│   │   │   ├── queue.ts
│   │   │   └── worker.ts
│   │   └── server.ts
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── DEPLOY.md
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── package-lock.json
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── agent-space/
│   │   │   │   ├── builder/
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── import/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── versions/
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── agents/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── api-marketplace/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── signup/
│   │   │   │       └── page.tsx
│   │   │   ├── collaboration/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── agents/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── api-keys/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── creator/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── runs/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── user/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── versioning/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── docs/
│   │   │   │   └── page.tsx
│   │   │   ├── explore/
│   │   │   │   └── page.tsx
│   │   │   ├── leaderboard/
│   │   │   │   └── page.tsx
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx
│   │   │   ├── pricing/
│   │   │   │   └── page.tsx
│   │   │   ├── run/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── schedule/
│   │   │   │   └── page.tsx
│   │   │   ├── team/
│   │   │   │   └── page.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── agent/
│   │   │   │   ├── agent-card.tsx
│   │   │   │   ├── agent-detail-header.tsx
│   │   │   │   ├── agent-filters.tsx
│   │   │   │   ├── agent-grid.tsx
│   │   │   │   ├── agent-tools-list.tsx
│   │   │   │   ├── download-buttons.tsx
│   │   │   │   ├── run-modal.tsx
│   │   │   │   └── trending-agents.tsx
│   │   │   ├── agent-runner/
│   │   │   │   ├── AgentRunnerDialog.tsx
│   │   │   │   ├── ApiConfigStep.tsx
│   │   │   │   ├── ExecutionStep.tsx
│   │   │   │   ├── PermissionReviewStep.tsx
│   │   │   │   ├── PermissionStep.tsx
│   │   │   │   ├── ResultStep.tsx
│   │   │   │   ├── UserTypeStep.tsx
│   │   │   │   └── ValidationStep.tsx
│   │   │   ├── agent-space/
│   │   │   │   ├── config-panel.tsx
│   │   │   │   ├── copilot-panel.tsx
│   │   │   │   ├── create-agent-dialog.tsx
│   │   │   │   ├── deploy-dialog.tsx
│   │   │   │   ├── diff-viewer.tsx
│   │   │   │   ├── file-import-panel.tsx
│   │   │   │   └── flow-canvas.tsx
│   │   │   ├── api-marketplace/
│   │   │   │   ├── api-card.tsx
│   │   │   │   └── api-filters-sidebar.tsx
│   │   │   ├── collaboration/
│   │   │   │   ├── config-panel.tsx
│   │   │   │   ├── workflow-canvas.tsx
│   │   │   │   └── workflow-list.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── activity-list.tsx
│   │   │   │   ├── agent-metrics-table.tsx
│   │   │   │   ├── creator-form.tsx
│   │   │   │   ├── creator-stats.tsx
│   │   │   │   ├── mini-chart.tsx
│   │   │   │   ├── run-detail.tsx
│   │   │   │   ├── runs-table.tsx
│   │   │   │   ├── secret-manager.tsx
│   │   │   │   ├── stat-card.tsx
│   │   │   │   └── stats-cards.tsx
│   │   │   ├── landing/
│   │   │   │   ├── AgentPreviewSection.tsx
│   │   │   │   ├── CTASection.tsx
│   │   │   │   ├── FeaturesSection.tsx
│   │   │   │   ├── GlassCard.tsx
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── LandingFooter.tsx
│   │   │   │   ├── MeshBackground.tsx
│   │   │   │   └── StatsStrip.tsx
│   │   │   ├── layout/
│   │   │   │   ├── copilot-fab.tsx
│   │   │   │   ├── dashboard-layout.tsx
│   │   │   │   ├── dashboard-topbar.tsx
│   │   │   │   ├── footer.tsx
│   │   │   │   ├── navbar.tsx
│   │   │   │   ├── providers.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── theme-provider.tsx
│   │   │   ├── marketplace/
│   │   │   │   ├── best-for-you.tsx
│   │   │   │   ├── featured-collections.tsx
│   │   │   │   ├── marketplace-agent-card.tsx
│   │   │   │   ├── marketplace-sidebar.tsx
│   │   │   │   └── run-agent-modal.tsx
│   │   │   ├── notifications/
│   │   │   │   ├── notification-bell.tsx
│   │   │   │   └── notification-item.tsx
│   │   │   ├── runner/
│   │   │   ├── schedule/
│   │   │   │   └── schedule-dialog.tsx
│   │   │   ├── ui/
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── background-grid.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── grid-pattern.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── pricing-interaction.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── spinner-1.tsx
│   │   │   │   ├── spotlight-button.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   └── textarea.tsx
│   │   │   └── versioning/
│   │   │       ├── diff-panel.tsx
│   │   │       └── version-timeline.tsx
│   │   ├── hooks/
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-local-storage.ts
│   │   │   ├── use-media-query.ts
│   │   │   ├── use-scroll-reveal.ts
│   │   │   ├── useAgentRunner.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── useCopilot.ts
│   │   │   ├── useDashboard.ts
│   │   │   ├── useExplore.ts
│   │   │   ├── useNotifications.ts
│   │   │   └── useScheduler.ts
│   │   ├── lib/
│   │   │   ├── agent-frameworks.ts
│   │   │   ├── api-marketplace-data.ts
│   │   │   ├── api.ts
│   │   │   ├── collaboration-data.ts
│   │   │   ├── config.ts
│   │   │   ├── constants.ts
│   │   │   ├── copilot-engine.ts
│   │   │   ├── demo-auth.ts
│   │   │   ├── leaderboard-data.ts
│   │   │   ├── marketplace-data.ts
│   │   │   ├── notification-data.ts
│   │   │   ├── queries.ts
│   │   │   ├── schedule-data.ts
│   │   │   ├── team-data.ts
│   │   │   ├── trending-agents.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts
│   │   │   └── versioning-data.ts
│   │   ├── store/
│   │   │   ├── auth-store.ts
│   │   │   └── ui-store.ts
│   │   └── styles/
│   ├── .env.local
│   ├── .next-dev.err.log
│   ├── .next-dev.out.log
│   ├── components.json
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   └── tsconfig.tsbuildinfo
├── files.csv
├── generate-mapping.js
└── README.md

```

## Key Directories

- `frontend/`: The main Next.js application directory.
- `frontend/src/app/`: Contains the Next.js App Router pages and layouts.
  - `/explore`: Agent marketplace.
  - `/team`: Team dashboard, RBAC, settings.
  - `/leaderboard`: Ranking for creators, agents, and APIs.
  - `/dashboard`: User personal dashboard.
  - `/agent-space`: Agent creation and configuration workspace.
  - `/auth`: Authentication flows (Login/Signup).
- `frontend/src/components/`: Reusable React components.
  - `/ui`: Shadcn UI primitives (Buttons, Inputs, Dialogs, etc.).
  - `/layout`: Global layout components (Navbar, Sidebar, Copilot Fab).
  - `/marketplace`: Components specific to the explore/marketplace pages.
- `frontend/src/lib/`: Utility functions, constants, types, and mock data.
- `frontend/src/hooks/`: Custom React hooks (e.g., `useAgentRunner`).

## Architecture Overview
Omip is an "Agent as a Service" (AaaS) platform. The frontend acts as a marketplace, a builder, and a team collaboration environment. The application makes heavy use of client-side React components (indicated by `"use client"`) for interactivity, such as the multi-step `AgentRunnerDialog`, drag-and-drop workflow builders, and real-time settings configurations.
