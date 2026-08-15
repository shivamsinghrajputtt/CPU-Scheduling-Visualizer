# Contributing

Thanks for your interest in improving CPU Scheduling Visualizer.

## Development

1. Fork or create a feature branch from `main`.
2. Run the project with a local HTTP server because the UI uses ES modules.
3. Run the test suite before opening a pull request:

```bash
npm test
```

4. Keep scheduling logic independent from DOM rendering.
5. Add regression tests for algorithm or metrics changes.
6. Keep pull requests focused and explain the reason for the change.

## Pull requests

A good pull request should include:

- a clear description of the problem and solution;
- tests for correctness-sensitive changes;
- screenshots for meaningful UI changes;
- no secrets or generated credentials;
- passing GitHub Actions checks.

Please do not merge changes that bypass failing correctness tests.
