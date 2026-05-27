const fs = require('fs');
const path = require('path');

const excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build', '.gemini', 'coverage'];
const basePath = 'c:\\PRIYANSH SHARMA\\AAAS DEV - 4 - Copy orignal\\omip';

function generateTree(dir, prefix = '') {
  let output = '';
  try {
    const files = fs.readdirSync(dir);
    
    // Sort directories first, then files
    files.sort((a, b) => {
      const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
      const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (excludeDirs.includes(file)) continue;

      const fullPath = path.join(dir, file);
      const isLast = i === files.length - 1;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        output += `${prefix}${isLast ? '└── ' : '├── '}${file}/\n`;
        output += generateTree(fullPath, prefix + (isLast ? '    ' : '│   '));
      } else {
        output += `${prefix}${isLast ? '└── ' : '├── '}${file}\n`;
      }
    }
  } catch (e) {
    // Ignore permissions errors
  }
  return output;
}

const tree = generateTree(basePath);
const pkgJsonPath = path.join(basePath, 'frontend', 'package.json');
let dependencies = '';
if (fs.existsSync(pkgJsonPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    dependencies = Object.keys(pkg.dependencies || {}).join(', ');
  } catch (e) {}
}

const markdown = `# Omip - Project Codebase Mapping

This document provides a comprehensive mapping of the Omip codebase to help new editors or AI models understand the project structure.

## Tech Stack (Frontend)
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Components**: shadcn/ui
- **Dependencies**: ${dependencies}

## Directory Structure

\`\`\`
omip/
${tree}
\`\`\`

## Key Directories

- \`frontend/\`: The main Next.js application directory.
- \`frontend/src/app/\`: Contains the Next.js App Router pages and layouts.
  - \`/explore\`: Agent marketplace.
  - \`/team\`: Team dashboard, RBAC, settings.
  - \`/leaderboard\`: Ranking for creators, agents, and APIs.
  - \`/dashboard\`: User personal dashboard.
  - \`/agent-space\`: Agent creation and configuration workspace.
  - \`/auth\`: Authentication flows (Login/Signup).
- \`frontend/src/components/\`: Reusable React components.
  - \`/ui\`: Shadcn UI primitives (Buttons, Inputs, Dialogs, etc.).
  - \`/layout\`: Global layout components (Navbar, Sidebar, Copilot Fab).
  - \`/marketplace\`: Components specific to the explore/marketplace pages.
- \`frontend/src/lib/\`: Utility functions, constants, types, and mock data.
- \`frontend/src/hooks/\`: Custom React hooks (e.g., \`useAgentRunner\`).

## Architecture Overview
Omip is an "Agent as a Service" (AaaS) platform. The frontend acts as a marketplace, a builder, and a team collaboration environment. The application makes heavy use of client-side React components (indicated by \`"use client"\`) for interactivity, such as the multi-step \`AgentRunnerDialog\`, drag-and-drop workflow builders, and real-time settings configurations.
`;

fs.writeFileSync(path.join(basePath, 'project-mapping.md'), markdown);
console.log('Done');
