# Task Completion Checklist

Before considering a task complete, ensure the following steps are taken:

1. **Verify Functionality**: Manually test the changes in the development environment.
2. **Run Tests**: Execute `npm run test` to ensure no regressions were introduced.
3. **Linting**: Run `npm run lint` and fix any reported issues.
4. **Type Checking**: Ensure there are no TypeScript errors (`tsc` if applicable, or check IDE).
5. **Update Documentation**: If the changes affect architecture or public APIs, update `ARCHITECTURE.md` or relevant READMEs.
6. **Update BOARD.md**: Mark the task as completed in the project board.
