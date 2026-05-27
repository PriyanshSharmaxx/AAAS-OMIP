/**
 * prisma/seed-integrations.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding integrations...");

  const integrations = [
    {
      name: "Google Workspace",
      slug: "google",
      description: "Access Gmail, Google Drive, and Calendar.",
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      defaultScopes: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.file"
      ],
      iconUrl: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png"
    },
    {
      name: "Slack",
      slug: "slack",
      description: "Send messages and read channel history.",
      authUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      defaultScopes: ["chat:write", "channels:read", "reactions:write"],
      iconUrl: "https://cdn-icons-png.flaticon.com/512/3800/3800024.png"
    },
    {
      name: "GitHub",
      slug: "github",
      description: "Manage repositories, issues, and pull requests.",
      authUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      defaultScopes: ["repo", "user"],
      iconUrl: "https://cdn-icons-png.flaticon.com/512/25/25231.png"
    }
  ];

  for (const integration of integrations) {
    await prisma.integration.upsert({
      where: { slug: integration.slug },
      update: integration,
      create: integration,
    });
    console.log(`  - ${integration.name} [${integration.slug}]`);
  }

  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
