/**
 * prisma/seed.ts
 * Run: npx ts-node prisma/seed.ts
 *
 * Seeds the database with initial demo data for development.
 */

import { PrismaClient, UserRole, AgentStatus, WorkflowRunStatus, TeamRole, InviteStatus, ListingStatus, PricingModel, Prisma, NotificationType, ResourceType, PermissionAction } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding database...");

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminPass   = await bcrypt.hash("Admin@1234",   12);
  const creatorPass = await bcrypt.hash("Creator@1234", 12);
  const userPass    = await bcrypt.hash("User@1234",    12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@omip.io" },
    update: {},
    create: {
      email: "admin@omip.io",
      username: "admin",
      passwordHash: adminPass,
      role: UserRole.ADMIN,
      displayName: "Platform Admin",
    },
  });

  const creator = await prisma.user.upsert({
    where: { email: "creator@omip.io" },
    update: {},
    create: {
      email: "creator@omip.io",
      username: "alexchen_dev",
      passwordHash: creatorPass,
      role: UserRole.CREATOR,
      displayName: "Alex Chen",
      bio: "AI agent engineer. Building tools that actually work.",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@omip.io" },
    update: {},
    create: {
      email: "user@omip.io",
      username: "demo_user",
      passwordHash: userPass,
      role: UserRole.USER,
      displayName: "Demo User",
    },
  });

  console.log(`✅  Users seeded: admin=${admin.id}, creator=${creator.id}, user=${user.id}`);

  // ── Agents ─────────────────────────────────────────────────────────────────

  const researchBot = await prisma.agent.upsert({
    where: { id: "seed-agent-research-bot" },
    update: {},
    create: {
      id: "seed-agent-research-bot",
      userId: creator.id,
      name: "ResearchBot Pro",
      description: "Deep web research with source validation, citations, and structured summaries.",
      category: "research",
      prompt: `You are ResearchBot Pro, an expert research assistant.
When given a topic, you:
1. Search for relevant, recent information
2. Validate sources for credibility
3. Synthesize findings into a structured report
4. Provide proper citations in APA format
5. Highlight key insights and gaps

Always be factual, cite sources, and clearly distinguish between facts and analysis.`,
      model: "gpt-4o",
      config: {
        temperature: 0.3,
        maxTokens: 4096,
        topP: 1,
      },
      tools: ["web_search", "cite_source"],
      isPublic: true,
      status: AgentStatus.ACTIVE,
      version: "2.1.0",
      tags: ["research", "citations", "GPT-4"],
      runsCount: 89220,
      successCount: 86900,
      failureCount: 2320,
    },
  });

  const codeReviewer = await prisma.agent.upsert({
    where: { id: "seed-agent-code-reviewer" },
    update: {},
    create: {
      id: "seed-agent-code-reviewer",
      userId: creator.id,
      name: "CodeReviewer Agent",
      description: "Automated PR review with security scanning, style guide enforcement, and fixes.",
      category: "development",
      prompt: `You are CodeReviewer Agent, a senior software engineer assistant.
When reviewing code, you:
1. Identify security vulnerabilities (OWASP Top 10)
2. Check for code style and best practices
3. Suggest performance improvements
4. Detect potential bugs and edge cases
5. Provide specific, actionable feedback with code examples

Be thorough but constructive. Prioritise security issues.`,
      model: "gpt-4o",
      config: {
        temperature: 0.1,
        maxTokens: 8192,
      },
      tools: ["code_analysis", "github_api"],
      isPublic: true,
      status: AgentStatus.ACTIVE,
      version: "1.4.0",
      tags: ["code-review", "security", "CI/CD"],
      runsCount: 58940,
      successCount: 55200,
      failureCount: 3740,
    },
  });

  const draftAgent = await prisma.agent.upsert({
    where: { id: "seed-agent-draft" },
    update: {},
    create: {
      id: "seed-agent-draft",
      userId: user.id,
      name: "My Draft Agent",
      description: "Work in progress.",
      category: "general",
      prompt: "You are a helpful assistant.",
      model: "gpt-4o-mini",
      config: { temperature: 0.7, maxTokens: 2048 },
      tools: [],
      isPublic: false,
      status: AgentStatus.DRAFT,
    },
  });

  console.log(`✅  Agents seeded: ${researchBot.name}, ${codeReviewer.name}, ${draftAgent.name}`);

  // ── Marketplace Demo Agents (matching frontend static IDs ag-1..ag-16) ──────

  const marketplaceAgents = [
    { id: "ag-1",  name: "AutoCoder Pro",       category: "development", model: "llama-3.3-70b-versatile", tags: ["code","github","ai"],             isPublic: true,  runsCount: 48520, successCount: 47064, framework: "LangChain", prompt: "You are AutoCoder Pro, an expert AI code generation assistant. You generate high-quality code across 20+ programming languages, integrate with GitHub for PR workflows, and provide thorough code reviews with actionable feedback." },
    { id: "ag-2",  name: "TestRunner AI",        category: "development", model: "llama-3.3-70b-versatile", tags: ["testing","jest","ci"],            isPublic: true,  runsCount: 19870, successCount: 18679, framework: "LangChain", prompt: "You are TestRunner AI. You generate comprehensive unit, integration, and E2E tests. You support Jest, Pytest, Cypress, and Playwright. Always write tests that cover edge cases and failure modes." },
    { id: "ag-3",  name: "SecScan Pro",          category: "development", model: "llama-3.3-70b-versatile", tags: ["security","sast","devops"],      isPublic: true,  runsCount: 13890, successCount: 13612, framework: "LangChain", prompt: "You are SecScan Pro, a security scanning agent. Audit codebases for OWASP Top 10 vulnerabilities, check dependencies for CVEs, and generate compliance reports." },
    { id: "ag-4",  name: "DataPipe ETL",         category: "analytics",   model: "llama-3.3-70b-versatile", tags: ["etl","sql","data"],              isPublic: true,  runsCount: 37890, successCount: 36374, framework: "LangChain", prompt: "You are DataPipe ETL, a data pipeline automation agent. You extract, transform, and load data from 50+ sources including SQL, NoSQL, and REST APIs. Generate optimised ETL scripts and data transformation logic." },
    { id: "ag-5",  name: "InsightMiner",         category: "analytics",   model: "llama-3.3-70b-versatile", tags: ["bi","charts","nlp"],             isPublic: true,  runsCount: 15230, successCount: 14164, framework: "LangChain", prompt: "You are InsightMiner, a business intelligence agent. Analyse data using natural language queries, surface actionable insights, and suggest visualisations. Provide clear, executive-ready summaries." },
    { id: "ag-6",  name: "SocialPulse AI",       category: "marketing",   model: "llama-3.3-70b-versatile", tags: ["social","content","scheduling"], isPublic: true,  runsCount: 31450, successCount: 28934, framework: "LangChain", prompt: "You are SocialPulse AI. Monitor social media trends, generate engagement reports, draft posts for Twitter/X, LinkedIn, and Instagram, and analyse competitor activity." },
    { id: "ag-7",  name: "EmailGenius",          category: "sales",       model: "llama-3.3-70b-versatile", tags: ["email","outreach","crm"],        isPublic: true,  runsCount: 22340, successCount: 19883, framework: "LangChain", prompt: "You are EmailGenius, an AI email assistant. Draft personalised cold outreach campaigns, suggest A/B test subject lines, and create follow-up sequences. Write emails that convert." },
    { id: "ag-8",  name: "LeadScore AI",         category: "sales",       model: "llama-3.3-70b-versatile", tags: ["leads","crm","scoring"],         isPublic: true,  runsCount: 11200, successCount: 10192, framework: "LangChain", prompt: "You are LeadScore AI. Score and prioritise inbound leads using firmographic data, intent signals, and CRM history. Provide a score from 0-100 with justification for each lead." },
    { id: "ag-9",  name: "HireAssist",           category: "hr",          model: "llama-3.3-70b-versatile", tags: ["recruiting","hr","automation"],  isPublic: true,  runsCount: 8900,  successCount: 8455,  framework: "LangChain", prompt: "You are HireAssist. Screen resumes against job descriptions, schedule interviews, and generate structured evaluation reports. Be objective, fair, and focus on skills." },
    { id: "ag-10", name: "MeetingScribe",        category: "productivity", model: "llama-3.3-70b-versatile", tags: ["meetings","transcription","slack"],isPublic: true, runsCount: 29100, successCount: 27063, framework: "LangChain", prompt: "You are MeetingScribe. Transcribe meeting content, extract action items with owners and deadlines, and generate concise summaries. Format output for Slack or email." },
    { id: "ag-11", name: "DocuMind",             category: "productivity", model: "llama-3.3-70b-versatile", tags: ["ocr","pdf","documents"],         isPublic: true,  runsCount: 25670, successCount: 25413, framework: "LangChain", prompt: "You are DocuMind. Extract structured data from PDFs, invoices, contracts, and forms with high accuracy. Return clean JSON with all extracted fields." },
    { id: "ag-12", name: "InfraWatch",           category: "devops",      model: "llama-3.3-70b-versatile", tags: ["monitoring","cloud","alerts"],   isPublic: true,  runsCount: 28900, successCount: 28611, framework: "LangChain", prompt: "You are InfraWatch. Monitor infrastructure in real-time, detect anomalies, recommend auto-scaling actions, and generate intelligent alert summaries with root cause analysis." },
    { id: "ag-13", name: "FlowBuilder",          category: "automation",  model: "llama-3.3-70b-versatile", tags: ["workflow","no-code","integrations"],isPublic: true,runsCount: 17650, successCount: 15885, framework: "n8n",      prompt: "You are FlowBuilder, a workflow automation assistant. Connect Notion, Slack, Google Sheets, and Airtable using natural language descriptions. Generate n8n workflow JSON configurations." },
    { id: "ag-14", name: "FinanceTracker AI",    category: "finance",     model: "llama-3.3-70b-versatile", tags: ["finance","expenses","reporting"], isPublic: true,  runsCount: 9800,  successCount: 9310,  framework: "LangChain", prompt: "You are FinanceTracker AI. Read bank statements and transaction data, categorise expenses, detect anomalies, and deliver weekly financial health reports in a clear format." },
    { id: "ag-15", name: "ResearchBot",          category: "research",    model: "llama-3.3-70b-versatile", tags: ["research","web","citations"],    isPublic: true,  runsCount: 24500, successCount: 22295, framework: "LangChain", prompt: "You are ResearchBot, a deep-research assistant. Search, synthesise, and cite sources across the web and academic databases. Always provide structured reports with proper citations and confidence levels." },
    { id: "ag-16", name: "ContentWriter",        category: "marketing",   model: "llama-3.3-70b-versatile", tags: ["content","seo","writing"],       isPublic: true,  runsCount: 33200, successCount: 29216, framework: "LangChain", prompt: "You are ContentWriter AI. Generate SEO-optimised blog posts, social copy, and email campaigns tailored to the provided brand voice and target audience. Always include meta descriptions and keywords." },
  ];

  for (const ag of marketplaceAgents) {
    await prisma.agent.upsert({
      where: { id: ag.id },
      update: {},
      create: {
        id:           ag.id,
        userId:       creator.id,
        name:         ag.name,
        description:  ag.prompt.slice(0, 200),
        category:     ag.category,
        prompt:       ag.prompt,
        model:        ag.model,
        framework:    ag.framework,
        type:         ag.framework === "n8n" ? "workflow" : "llm",
        config:       { temperature: 0.7, maxTokens: 4096 },
        tools:        [],
        tags:         ag.tags,
        isPublic:     ag.isPublic,
        status:       AgentStatus.ACTIVE,
        version:      "1.0.0",
        runsCount:    ag.runsCount,
        successCount: ag.successCount,
        failureCount: ag.runsCount - ag.successCount,
      },
    });
  }

  console.log(`✅  Marketplace demo agents seeded: ag-1 through ag-16`);

  // ── Execution Logs (sample history) ───────────────────────────────────────

  await prisma.executionLog.createMany({
    data: [
      {
        agentId: researchBot.id,
        userId: user.id,
        modelUsed: "gpt-4o",
        promptUsed: researchBot.prompt,
        toolsUsed: ["web_search"],
        inputData: { topic: "AI industry trends 2026" },
        outputData: {
          summary: "Key findings: LLM commoditisation accelerating...",
          sources: ["arxiv.org/...", "techcrunch.com/..."],
          wordCount: 2400,
        },
        status: "COMPLETED",
        durationMs: 8420,
        promptTokens: 512,
        completionTokens: 1800,
        totalTokens: 2312,
        triggerSource: "manual",
        startedAt: new Date(Date.now() - 10 * 3600_000),
        completedAt: new Date(Date.now() - 10 * 3600_000 + 8420),
      },
      {
        agentId: codeReviewer.id,
        userId: user.id,
        modelUsed: "gpt-4o",
        promptUsed: codeReviewer.prompt,
        toolsUsed: ["code_analysis"],
        inputData: { repo: "omip/frontend", pr: 42 },
        outputData: Prisma.JsonNull,
        status: "FAILED",
        errorMessage: "GitHub API rate limit exceeded. Retry after 3600s.",
        durationMs: 30000,
        retryCount: 3,
        triggerSource: "scheduled",
        startedAt: new Date(Date.now() - 2 * 3600_000),
        completedAt: new Date(Date.now() - 2 * 3600_000 + 30000),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅  Execution logs seeded");

  // ── Sample Workflow ────────────────────────────────────────────────────────

  const sampleWorkflow = await prisma.workflow.upsert({
    where: { id: "seed-workflow-research-summary" },
    update: {},
    create: {
      id: "seed-workflow-research-summary",
      userId: creator.id,
      name: "Research & Summarise",
      description: "Two-step workflow: research a topic then summarise into bullet points.",
      steps: [
        {
          id: "step_research",
          name: "Research",
          agentId: researchBot.id,
          inputTemplate: "{{initial_input}}",
        },
        {
          id: "step_summarise",
          name: "Summarise",
          agentId: researchBot.id,
          inputTemplate: "Summarise the following research into exactly 5 bullet points:\n\n{{step_research.output}}",
          config: { temperature: 0.2, maxTokens: 512 },
        },
      ],
      isPublic: true,
      runsCount: 3,
    },
  });

  // One completed workflow run
  await prisma.workflowRun.createMany({
    data: [
      {
        workflowId: sampleWorkflow.id,
        userId: user.id,
        status: WorkflowRunStatus.COMPLETED,
        inputData: { initialInput: "Latest breakthroughs in quantum computing 2026" },
        outputData: { output: "• Quantum error correction improved by 40%\n• IBM announced 1000+ qubit processor..." },
        stepResults: [
          { stepId: "step_research", stepName: "Research", agentId: researchBot.id, success: true, output: "Quantum computing...", durationMs: 4200, iterations: 2, tokens: { promptTokens: 400, completionTokens: 1600, totalTokens: 2000 } },
          { stepId: "step_summarise", stepName: "Summarise", agentId: researchBot.id, success: true, output: "• Quantum error correction improved by 40%", durationMs: 1100, iterations: 1, tokens: { promptTokens: 350, completionTokens: 180, totalTokens: 530 } },
        ],
        triggerSource: "manual",
        durationMs: 5300,
        startedAt: new Date(Date.now() - 5 * 3600_000),
        completedAt: new Date(Date.now() - 5 * 3600_000 + 5300),
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅  Workflow seeded: ${sampleWorkflow.name}`);

  // ── Sample Schedule ────────────────────────────────────────────────────────

  const sampleSchedule = await prisma.schedule.upsert({
    where: { id: "seed-schedule-daily-brief" },
    update: {},
    create: {
      id:             "seed-schedule-daily-brief",
      userId:         creator.id,
      agentId:        researchBot.id,
      name:           "Daily AI Brief",
      description:    "Runs every weekday at 09:00 UTC to summarise overnight AI developments.",
      cronExpression: "0 9 * * 1-5",
      inputTemplate:  "Good morning! Today is {{date}}. Summarise the top 5 AI and ML developments from the last 24 hours.",
      overrides:      { temperature: 0.3, maxTokens: 1024 },
      timezone:       "UTC",
      maxRetries:     3,
      isActive:       true,
      isPaused:       false,
      runsCount:      12,
      failureCount:   1,
      lastRunAt:      new Date(Date.now() - 24 * 3600_000),
      nextRunAt:      new Date(Date.now() + 12 * 3600_000),
    },
  });

  console.log(`✅  Schedule seeded: ${sampleSchedule.name}`);

  // ── Sample Team ────────────────────────────────────────────────────────────

  const sampleTeam = await prisma.team.upsert({
    where: { id: "seed-team-ai-builders" },
    update: {},
    create: {
      id:          "seed-team-ai-builders",
      name:        "AI Builders",
      description: "A team of AI agent developers building on the Omip platform.",
      slug:        "ai-builders",
      maxMembers:  10,
      members: {
        create: [
          {
            userId:       creator.id,
            role:         TeamRole.OWNER,
            inviteStatus: InviteStatus.ACCEPTED,
            joinedAt:     new Date(Date.now() - 30 * 86400_000),
          },
          {
            userId:       user.id,
            role:         TeamRole.MEMBER,
            inviteStatus: InviteStatus.ACCEPTED,
            invitedById:  creator.id,
            joinedAt:     new Date(Date.now() - 7 * 86400_000),
          },
        ],
      },
    },
  });

  console.log(`✅  Team seeded: ${sampleTeam.name}`);

  // ── Sample Marketplace Listing ─────────────────────────────────────────────

  const researchListing = await prisma.listing.upsert({
    where:  { agentId: researchBot.id },
    update: {},
    create: {
      id:          "seed-listing-research-bot",
      agentId:     researchBot.id,
      userId:      creator.id,
      name:        "ResearchBot Pro API",
      tagline:     "Production-grade AI research with citations — plug it into your app in minutes.",
      description: `ResearchBot Pro gives your application instant access to deep, cited research.\n\nFeatures:\n- Structured research reports with APA citations\n- Multi-source cross-validation\n- Configurable depth and output format\n- Markdown or JSON output\n\nIdeal for content platforms, knowledge bases, and developer tools.`,
      category:    "research",
      tags:        ["research", "citations", "gpt-4o", "production-ready"],
      pricingModel: PricingModel.FREE,
      rateLimitPerDay: 200,
      status:      ListingStatus.PUBLISHED,
      publishedAt: new Date(Date.now() - 14 * 86400_000),
      subscribersCount: 1,
      totalRunsCount:   3,
      avgRating:        5.0,
      reviewsCount:     1,
    },
  });

  // Seed subscription for the demo user
  const seedApiKey = `omip_${crypto.randomBytes(24).toString("hex")}`;
  await prisma.subscription.upsert({
    where: { listingId_userId: { listingId: researchListing.id, userId: user.id } },
    update: {},
    create: {
      listingId:    researchListing.id,
      userId:       user.id,
      apiKey:       seedApiKey,
      isActive:     true,
      dailyRunsUsed: 0,
      totalRunsUsed: 3,
      dailyResetAt: new Date(),
      lastUsedAt:   new Date(Date.now() - 2 * 3600_000),
      subscribedAt: new Date(Date.now() - 7 * 86400_000),
    },
  });

  // Seed a review from the demo user
  await prisma.listingReview.upsert({
    where:  { listingId_userId: { listingId: researchListing.id, userId: user.id } },
    update: {},
    create: {
      listingId: researchListing.id,
      userId:    user.id,
      rating:    5,
      comment:   "Incredible results out of the box. Integrated it into our content pipeline in under an hour. Highly recommended.",
    },
  });

  console.log(`✅  Marketplace seeded: ${researchListing.name}`);
  console.log(`   Subscriber API key (demo_user): ${seedApiKey}`);

  // ── Sample Agent Versions ──────────────────────────────────────────────────

  const versionBase = {
    agentId:     researchBot.id,
    createdBy:   creator.id,
    name:        researchBot.name,
    description: researchBot.description,
    model:       researchBot.model,
    tools:       researchBot.tools as Prisma.InputJsonValue,
  };

  await prisma.agentVersion.createMany({
    data: [
      {
        ...versionBase,
        id:            "seed-agentversion-1",
        versionNumber: 1,
        prompt:        "You are ResearchBot, an AI research assistant. Search for information and provide summaries.",
        config:        { temperature: 0.5, maxTokens: 2048 } as Prisma.InputJsonValue,
        changelog:     "Initial release — basic research capability.",
        createdAt:     new Date(Date.now() - 30 * 86400_000),
      },
      {
        ...versionBase,
        id:            "seed-agentversion-2",
        versionNumber: 2,
        prompt:        researchBot.prompt,
        config:        researchBot.config as Prisma.InputJsonValue,
        changelog:     "v2 — APA citations, credibility validation, structured output.",
        createdAt:     new Date(Date.now() - 14 * 86400_000),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅  Agent versions seeded: ResearchBot Pro v1, v2");

  // ── Sample Notifications ───────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        userId:    user.id,
        type:      NotificationType.EXECUTION_COMPLETED,
        title:     "ResearchBot Pro run completed",
        body:      'Your agent "ResearchBot Pro" finished successfully in 8.4s.',
        metadata:  { agentName: "ResearchBot Pro", durationMs: 8420 },
        isRead:    false,
        createdAt: new Date(Date.now() - 10 * 3600_000),
      },
      {
        userId:    user.id,
        type:      NotificationType.EXECUTION_FAILED,
        title:     "CodeReviewer Agent run failed",
        body:      'Your agent "CodeReviewer Agent" encountered an error: GitHub API rate limit exceeded.',
        metadata:  { agentName: "CodeReviewer Agent", error: "GitHub API rate limit exceeded." },
        isRead:    true,
        readAt:    new Date(Date.now() - 1 * 3600_000),
        createdAt: new Date(Date.now() - 2 * 3600_000),
      },
      {
        userId:    user.id,
        type:      NotificationType.INVITE_RECEIVED,
        title:     "Team invite from @alexchen_dev",
        body:      '@alexchen_dev invited you to join "AI Builders" as MEMBER.',
        metadata:  { teamName: "AI Builders", inviterUsername: "alexchen_dev", role: "MEMBER" },
        isRead:    true,
        readAt:    new Date(Date.now() - 6 * 86400_000),
        createdAt: new Date(Date.now() - 7 * 86400_000),
      },
      {
        userId:    creator.id,
        type:      NotificationType.SUBSCRIPTION_NEW,
        title:     "New subscriber",
        body:      '@demo_user subscribed to your listing "ResearchBot Pro API".',
        metadata:  { listingName: "ResearchBot Pro API", subscriberUsername: "demo_user" },
        isRead:    false,
        createdAt: new Date(Date.now() - 7 * 86400_000),
      },
      {
        userId:    creator.id,
        type:      NotificationType.REVIEW_RECEIVED,
        title:     "New 5-star review",
        body:      '@demo_user left a ★★★★★ review on "ResearchBot Pro API".',
        metadata:  { listingName: "ResearchBot Pro API", rating: 5, reviewerUsername: "demo_user" },
        isRead:    false,
        createdAt: new Date(Date.now() - 7 * 86400_000 + 3600_000),
      },
    ],
    skipDuplicates: false,
  });

  console.log("✅  Notifications seeded: 3 for demo_user, 2 for creator");

  // ── Sample Permissions ─────────────────────────────────────────────────────
  // Give demo_user explicit RUN access to code-reviewer (private agent)

  await prisma.permission.createMany({
    data: [
      {
        userId:       user.id,
        resourceType: ResourceType.AGENT,
        resourceId:   codeReviewer.id,
        action:       PermissionAction.RUN,
        grantedBy:    creator.id,
        createdAt:    new Date(Date.now() - 3 * 86400_000),
      },
      {
        userId:       user.id,
        resourceType: ResourceType.WORKFLOW,
        resourceId:   sampleWorkflow.id,
        action:       PermissionAction.RUN,
        grantedBy:    creator.id,
        createdAt:    new Date(Date.now() - 3 * 86400_000),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅  Permissions seeded: demo_user can RUN CodeReviewer + Research workflow");

  // ── API Marketplace Products ───────────────────────────────────────────────

  const apiProducts = [
    {
      id: "api-openweather",
      name: "OpenWeather API",
      description: "Real-time weather data, forecasts, and historical climate records for any location worldwide. Powers thousands of apps with accurate meteorological data.",
      category: "Data",
      baseUrl: "https://api.openweathermap.org/data/2.5",
      pricingType: "per_call" as const,
      pricePerCall: 0.0005,
      freeCallsPerDay: 1000,
      authType: "api_key" as const,
      isVerified: true,
      isActive: true,
      isFeatured: true,
      isTrending: false,
      rating: 4.7,
      reviewsCount: 2341,
      requestCount: 9800000,
      tags: ["weather", "forecast", "climate", "geolocation"],
      latencyMs: 120,
      uptimePct: 99.9,
      version: "2.5",
      proxyTarget: "https://httpbin.org/get",
    },
    {
      id: "api-openai-embeddings",
      name: "OpenAI Embeddings",
      description: "Generate high-quality text embeddings using OpenAI's latest models. Perfect for semantic search, clustering, classification, and recommendation systems.",
      category: "AI/ML",
      baseUrl: "https://api.openai.com/v1/embeddings",
      pricingType: "per_call" as const,
      pricePerCall: 0.0001,
      freeCallsPerDay: 100,
      authType: "bearer" as const,
      isVerified: true,
      isActive: true,
      isFeatured: true,
      isTrending: true,
      rating: 4.9,
      reviewsCount: 5892,
      requestCount: 45000000,
      tags: ["embeddings", "NLP", "semantic-search", "AI", "OpenAI"],
      latencyMs: 180,
      uptimePct: 99.95,
      version: "1.0",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-twilio-sms",
      name: "Twilio SMS Gateway",
      description: "Send and receive SMS messages globally with delivery receipts, scheduling, and analytics. 99.95% uptime SLA with enterprise-grade reliability.",
      category: "Communication",
      baseUrl: "https://api.twilio.com/2010-04-01",
      pricingType: "per_call" as const,
      pricePerCall: 0.0075,
      freeCallsPerDay: 10,
      authType: "basic" as const,
      isVerified: true,
      isActive: true,
      isFeatured: false,
      isTrending: false,
      rating: 4.8,
      reviewsCount: 3120,
      requestCount: 22000000,
      tags: ["SMS", "messaging", "communication", "notifications"],
      latencyMs: 95,
      uptimePct: 99.95,
      version: "2010-04-01",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-stripe-payments",
      name: "Stripe Payments API",
      description: "Full-featured payment processing: charges, subscriptions, invoices, refunds, and dispute management. PCI-DSS Level 1 compliant with 135+ currencies.",
      category: "Finance",
      baseUrl: "https://api.stripe.com/v1",
      pricingType: "per_call" as const,
      pricePerCall: 0.001,
      freeCallsPerDay: 200,
      authType: "bearer" as const,
      isVerified: true,
      isActive: true,
      isFeatured: true,
      isTrending: false,
      rating: 4.9,
      reviewsCount: 8740,
      requestCount: 120000000,
      tags: ["payments", "fintech", "subscriptions", "billing", "PCI"],
      latencyMs: 150,
      uptimePct: 99.99,
      version: "2023-10-16",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-google-search",
      name: "Google Custom Search",
      description: "Programmatic access to Google Search results. Retrieve web pages, images, news, and structured data with rich metadata and pagination support.",
      category: "Search",
      baseUrl: "https://customsearch.googleapis.com/customsearch/v1",
      pricingType: "per_call" as const,
      pricePerCall: 0.005,
      freeCallsPerDay: 100,
      authType: "api_key" as const,
      isVerified: true,
      isActive: true,
      isFeatured: false,
      isTrending: true,
      rating: 4.6,
      reviewsCount: 2105,
      requestCount: 18000000,
      tags: ["search", "web-scraping", "Google", "SERP"],
      latencyMs: 220,
      uptimePct: 99.8,
      version: "1",
      proxyTarget: "https://httpbin.org/get",
    },
    {
      id: "api-aws-s3-proxy",
      name: "S3 Storage Gateway",
      description: "Upload, download, and manage files in S3-compatible object storage. Supports presigned URLs, multipart uploads, metadata, and lifecycle policies.",
      category: "Storage",
      baseUrl: "https://s3.amazonaws.com",
      pricingType: "monthly" as const,
      priceMonthly: 9.99,
      freeCallsPerDay: 500,
      authType: "aws_sigv4" as const,
      isVerified: true,
      isActive: true,
      isFeatured: false,
      isTrending: false,
      rating: 4.7,
      reviewsCount: 1450,
      requestCount: 35000000,
      tags: ["storage", "S3", "files", "cloud", "AWS"],
      latencyMs: 85,
      uptimePct: 99.99,
      version: "2006-03-01",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-mixpanel-analytics",
      name: "Mixpanel Analytics",
      description: "Track user behaviour, funnels, retention, and A/B tests. Ingest events, query cohorts, and export reports programmatically via REST API.",
      category: "Analytics",
      baseUrl: "https://api.mixpanel.com",
      pricingType: "monthly" as const,
      priceMonthly: 24.99,
      freeCallsPerDay: 10000,
      authType: "bearer" as const,
      isVerified: true,
      isActive: true,
      isFeatured: false,
      isTrending: false,
      rating: 4.5,
      reviewsCount: 890,
      requestCount: 8000000,
      tags: ["analytics", "events", "funnels", "retention", "A/B-testing"],
      latencyMs: 110,
      uptimePct: 99.7,
      version: "2.0",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-virustotal",
      name: "VirusTotal Security Scanner",
      description: "Scan files, URLs, IPs, and domains against 70+ antivirus engines and threat intelligence feeds. Essential for security automation and malware detection pipelines.",
      category: "Security",
      baseUrl: "https://www.virustotal.com/api/v3",
      pricingType: "per_call" as const,
      pricePerCall: 0.002,
      freeCallsPerDay: 500,
      authType: "api_key" as const,
      isVerified: true,
      isActive: true,
      isFeatured: false,
      isTrending: true,
      rating: 4.8,
      reviewsCount: 1203,
      requestCount: 5500000,
      tags: ["security", "malware", "threat-intel", "antivirus", "SIEM"],
      latencyMs: 340,
      uptimePct: 99.5,
      version: "3.0",
      proxyTarget: "https://httpbin.org/get",
    },
    {
      id: "api-notion-db",
      name: "Notion Database API",
      description: "Read and write Notion pages, databases, and blocks. Automate knowledge management, create structured records, and sync data across tools.",
      category: "Productivity",
      baseUrl: "https://api.notion.com/v1",
      pricingType: "free" as const,
      freeCallsPerDay: 2000,
      authType: "bearer" as const,
      isVerified: true,
      isActive: true,
      isFeatured: true,
      isTrending: false,
      rating: 4.4,
      reviewsCount: 2780,
      requestCount: 12000000,
      tags: ["productivity", "Notion", "knowledge-base", "CMS", "automation"],
      latencyMs: 200,
      uptimePct: 99.6,
      version: "2022-06-28",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-cloudinary-media",
      name: "Cloudinary Media API",
      description: "Upload, transform, optimise, and deliver images and videos at scale. AI-powered background removal, smart cropping, format conversion, and CDN delivery.",
      category: "Media",
      baseUrl: "https://api.cloudinary.com/v1_1",
      pricingType: "monthly" as const,
      priceMonthly: 14.99,
      freeCallsPerDay: 1000,
      authType: "api_key" as const,
      isVerified: true,
      isActive: true,
      isFeatured: false,
      isTrending: true,
      rating: 4.7,
      reviewsCount: 3421,
      requestCount: 28000000,
      tags: ["media", "images", "video", "CDN", "AI-transforms"],
      latencyMs: 75,
      uptimePct: 99.9,
      version: "1.1",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-huggingface-inference",
      name: "Hugging Face Inference",
      description: "Run inference on 200,000+ open-source models — text classification, summarisation, translation, image generation, and audio transcription via simple REST calls.",
      category: "AI/ML",
      baseUrl: "https://api-inference.huggingface.co/models",
      pricingType: "per_call" as const,
      pricePerCall: 0.00015,
      freeCallsPerDay: 500,
      authType: "bearer" as const,
      isVerified: true,
      isActive: true,
      isFeatured: true,
      isTrending: true,
      rating: 4.6,
      reviewsCount: 4120,
      requestCount: 60000000,
      tags: ["AI", "ML", "NLP", "open-source", "HuggingFace", "LLM"],
      latencyMs: 850,
      uptimePct: 99.2,
      version: "2.0",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-sendgrid-email",
      name: "SendGrid Email API",
      description: "Transactional and marketing email delivery with templates, tracking, A/B tests, and suppression management. 99.97% deliverability with detailed analytics.",
      category: "Communication",
      baseUrl: "https://api.sendgrid.com/v3",
      pricingType: "free" as const,
      freeCallsPerDay: 100,
      authType: "bearer" as const,
      isVerified: true,
      isActive: true,
      isFeatured: false,
      isTrending: false,
      rating: 4.5,
      reviewsCount: 5670,
      requestCount: 88000000,
      tags: ["email", "transactional", "marketing", "SMTP", "SendGrid"],
      latencyMs: 130,
      uptimePct: 99.97,
      version: "3.0",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-alpha-vantage",
      name: "Alpha Vantage Finance",
      description: "Stock prices, forex, crypto, technical indicators, and fundamental data. 20+ years of historical data with real-time feeds and earnings calendars.",
      category: "Finance",
      baseUrl: "https://www.alphavantage.co/query",
      pricingType: "per_call" as const,
      pricePerCall: 0.001,
      freeCallsPerDay: 25,
      authType: "api_key" as const,
      isVerified: true,
      isActive: true,
      isFeatured: false,
      isTrending: true,
      rating: 4.3,
      reviewsCount: 1890,
      requestCount: 7000000,
      tags: ["finance", "stocks", "forex", "crypto", "trading"],
      latencyMs: 280,
      uptimePct: 99.4,
      version: "1.0",
      proxyTarget: "https://httpbin.org/get",
    },
    {
      id: "api-pinecone-vector",
      name: "Pinecone Vector DB",
      description: "Fully managed vector database for AI applications. Upsert, query, and filter billions of vectors with millisecond latency. Native support for metadata filtering and namespaces.",
      category: "AI/ML",
      baseUrl: "https://controller.pinecone.io",
      pricingType: "monthly" as const,
      priceMonthly: 49.99,
      freeCallsPerDay: 5000,
      authType: "api_key" as const,
      isVerified: true,
      isActive: true,
      isFeatured: true,
      isTrending: true,
      rating: 4.8,
      reviewsCount: 2150,
      requestCount: 14000000,
      tags: ["vector-db", "AI", "embeddings", "RAG", "similarity-search"],
      latencyMs: 12,
      uptimePct: 99.9,
      version: "2023-11-14",
      proxyTarget: "https://httpbin.org/post",
    },
    {
      id: "api-github-rest",
      name: "GitHub REST API",
      description: "Manage repositories, issues, PRs, workflows, and GitHub Actions programmatically. Full access to commit history, code review, and organisation management.",
      category: "Productivity",
      baseUrl: "https://api.github.com",
      pricingType: "free" as const,
      freeCallsPerDay: 5000,
      authType: "bearer" as const,
      isVerified: true,
      isActive: true,
      isFeatured: false,
      isTrending: false,
      rating: 4.9,
      reviewsCount: 12300,
      requestCount: 500000000,
      tags: ["GitHub", "git", "CI/CD", "DevOps", "repositories"],
      latencyMs: 90,
      uptimePct: 99.9,
      version: "2022-11-28",
      proxyTarget: "https://httpbin.org/get",
    },
  ];

  for (const api of apiProducts) {
    await (prisma as any).apiProduct.upsert({
      where: { id: api.id },
      update: {},
      create: api,
    });
  }

  console.log(`✅  API Marketplace seeded: ${apiProducts.length} products`);

  // ── ApiKey subscriptions for demo_user ────────────────────────────────────

  const subscribedApis = ["api-openweather", "api-openai-embeddings", "api-github-rest", "api-notion-db", "api-huggingface-inference"];

  const apiKeyRecords: { id: string; key: string; apiId: string }[] = [];
  for (const apiId of subscribedApis) {
    const key = `sk_live_${crypto.randomBytes(16).toString("hex")}`;
    const rec = await (prisma as any).apiKey.upsert({
      where: { userId_apiId: { userId: user.id, apiId } },
      update: {},
      create: {
        id: `apikey-demo-${apiId}`,
        userId: user.id,
        apiId,
        key,
        isActive: true,
        totalCalls: Math.floor(Math.random() * 800) + 50,
        lastUsedAt: new Date(Date.now() - Math.floor(Math.random() * 48) * 3600_000),
      },
    });
    apiKeyRecords.push({ id: rec.id, key: rec.key, apiId });
  }

  console.log(`✅  ApiKey subscriptions seeded: ${subscribedApis.length} keys for demo_user`);

  // ── ApiUsage history for demo_user ────────────────────────────────────────

  const statusCodes = [200, 200, 200, 200, 200, 201, 400, 429, 500];
  const endpoints   = ["/query", "/search", "/infer", "/generate", "/fetch"];
  const usageRows: object[] = [];

  for (const { id: apiKeyId, apiId } of apiKeyRecords) {
    for (let i = 0; i < 12; i++) {
      const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
      usageRows.push({
        userId: user.id,
        apiId,
        apiKeyId,
        statusCode,
        latencyMs: Math.floor(Math.random() * 400) + 40,
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400_000),
      });
    }
  }

  await (prisma as any).apiUsage.createMany({ data: usageRows, skipDuplicates: false });

  console.log(`✅  ApiUsage seeded: ${usageRows.length} call records`);

  // ── Billing Plans ──────────────────────────────────────────────────────────

  const plans = [
    {
      id: "plan-free",
      name: "Free",
      description: "Perfect for testing and personal use.",
      price: new Prisma.Decimal(0),
      interval: "month",
      features: { maxAgents: 3, monthlyCredits: 100, support: "community" },
    },
    {
      id: "plan-pro",
      name: "Pro",
      description: "For professional creators and small teams.",
      price: new Prisma.Decimal(29),
      interval: "month",
      features: { maxAgents: 20, monthlyCredits: 1000, support: "priority" },
    },
    {
      id: "plan-enterprise",
      name: "Enterprise",
      description: "Scaling AI infrastructure for large organisations.",
      price: new Prisma.Decimal(199),
      interval: "month",
      features: { maxAgents: 100, monthlyCredits: 10000, support: "dedicated" },
    },
  ];

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { id: plan.id },
      update: {},
      create: plan,
    });
  }

  // Demo user subscription
  await prisma.billingSubscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      planId: "plan-pro",
      status: "active",
      currentPeriodStart: new Date(Date.now() - 5 * 86400_000),
      currentPeriodEnd:   new Date(Date.now() + 25 * 86400_000),
    },
  });

  console.log(`✅  Billing plans and demo subscription seeded`);

  console.log("\n🎉  Seed complete!");
  console.log("   admin@omip.io   / Admin@1234");
  console.log("   creator@omip.io / Creator@1234");
  console.log("   user@omip.io    / User@1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
