"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Code2, Key, Rocket, Shield, Wrench } from "lucide-react";

const sections = [
  {
    icon: Rocket,
    title: "Getting Started",
    content: [
      "Create an account on Omip",
      "Browse the marketplace to find an agent",
      "Click 'Run Agent' and provide your API key",
      "View real-time execution logs and results",
    ],
  },
  {
    icon: Key,
    title: "API Keys",
    content: [
      "API keys are required to run agents that connect to LLM providers",
      "Keys are encrypted with AES-256 and never stored in plain text",
      "You can save keys in your dashboard for quick reuse",
      "Supported providers: OpenAI, Anthropic, Google AI, Custom",
    ],
  },
  {
    icon: Code2,
    title: "API Reference",
    content: [
      "Base URL: http://localhost:8000/api/v1",
      "Authentication: Bearer token in Authorization header",
      "POST /auth/signup - Create an account",
      "POST /auth/login - Get access token",
      "GET /agents - List available agents",
      "POST /runs - Execute an agent",
      "GET /runs/{id} - Check run status",
    ],
  },
  {
    icon: Wrench,
    title: "Creating Agents",
    content: [
      "Upgrade to Creator role to publish agents",
      "Define agent name, description, and category",
      "Choose execution type: Container, n8n, or API",
      "Configure required permissions and tools",
      "Publish to marketplace for others to use",
    ],
  },
  {
    icon: Shield,
    title: "Security",
    content: [
      "All API keys encrypted at rest (AES-256)",
      "Agent execution in isolated sandboxes",
      "JWT-based authentication with role-based access",
      "CORS protection and input validation",
      "No data retention beyond active sessions",
    ],
  },
  {
    icon: Book,
    title: "Execution Types",
    content: [
      "Container: Docker-based isolated execution for complex agents",
      "n8n: Workflow-based execution using n8n automation platform",
      "API: Direct HTTP API calls to external services",
      "Each type has its own configuration schema",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-24">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">Documentation</h1>
        <p className="text-lg text-muted-foreground">
          Everything you need to know about using and building on Omip.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <Card key={section.title} id={section.title.toLowerCase().replace(/\s+/g, "-")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <section.icon className="h-6 w-6 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.content.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
