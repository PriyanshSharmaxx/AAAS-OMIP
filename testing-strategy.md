# Omip Testing Strategy

Step 17 adds test coverage in layers so product-critical flows are protected before launch.

## Layers

- Backend unit tests: service behavior and core utility mapping
- Backend integration tests: auth, agent creation, execution, and permissions routes
- Frontend component tests: critical creation and runner dialog states
- End-to-end tests: signup/login, create agent, run agent, permissions grant, team invite, marketplace subscribe

## Commands

### Backend

```bash
cd backend-node
npm test
```

### Frontend component tests

```bash
cd frontend
npm test
```

### Frontend end-to-end tests

```bash
cd frontend
npm run test:e2e
```

## Notes

- The backend suite uses `vitest` and `supertest`.
- The frontend suite uses `vitest`, `jsdom`, and `@testing-library/react`.
- The e2e suite uses `playwright` and expects the frontend to be running.
- Existing repo-wide TypeScript issues outside the new test files may still affect broad build checks; the test layer is designed to be runnable independently.
