# Omip V1: Product Scope & Locked User Journeys

As part of Step 1 to productionize Omip, we have frozen the product scope. No new extraneous features will be added until the following core user journeys are fully supported with real backend state, validation, and error handling.

## Locked User Journeys for V1

1. **Discover an Agent**: A user can browse the Explore page, search, and filter to find a specific AI agent.
2. **Open Agent Details**: A user can view an agent's profile, reading its description, capabilities, required inputs, and success metrics.
3. **Run an Agent with Input**: A user can initiate the Agent Runner, configure necessary inputs (technical or non-technical), and start the execution.
4. **See Live Status/Output**: A user can watch real-time streaming logs and view the final formatted output of the agent execution.
5. **Save History**: The user's execution history (runs, inputs, outputs) is securely saved and accessible via their Dashboard.
6. **Creator Creates/Publishes**: A creator can use the Agent Space to draft, configure, test, and finally publish an agent to the public marketplace.
7. **Team Collaboration**: Team members can share agents, manage roles (RBAC), and execute shared resources within a Team Workspace.
8. **Grant Permissions**: Users can securely grant and manage necessary API permissions or data access required by specific agents during the execution flow.
9. **API Provider Subscriptions**: API providers can integrate their services, and the platform will track usage/subscriptions for Leaderboard and billing purposes.

---
*Note: Any feature outside of these 9 core journeys is considered out-of-scope for V1 and will be deferred to subsequent releases.*
