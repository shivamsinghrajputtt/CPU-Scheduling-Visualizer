# Architecture

The CPU Scheduling Visualizer is split into a scheduling engine and a browser UI.

```text
User Input
   |
   v
index.html / script.js
   |
   | process data + selected algorithm
   v
src/scheduling.js
   |
   +--> FCFS
   +--> SJF Non-Preemptive
   +--> SRTF / SJF Preemptive
   +--> Priority Non-Preemptive
   +--> Round Robin
   |
   v
CPU schedule segments
   |
   +--> Metrics (CT, TAT, WT, RT)
   +--> Gantt timeline
   +--> Step-by-step explanation
   +--> Result table / CSV
```

## Design goals

- **Pure scheduling logic:** `src/scheduling.js` has no DOM dependencies, making the algorithms independently testable.
- **Deterministic output:** equal-priority/arrival cases use stable, documented tie-breaking rules.
- **Safe rendering:** user-controlled process IDs are rendered through DOM APIs rather than trusted HTML strings.
- **Educational output:** the UI explains why a process was selected and shows the formulas used for metrics.
- **Fast idle handling:** non-preemptive algorithms jump directly to the next arrival instead of incrementing time one unit at a time.

## Data flow

1. The user adds processes with arrival time, burst time and optional priority.
2. `script.js` validates the input and calls `runScheduling()`.
3. The selected algorithm returns execution segments `{ pid, start, end }`.
4. `calculateMetrics()` derives completion, turnaround, waiting and response times.
5. The UI renders the timeline, explanation and metrics without modifying the scheduling result.

## Testing and CI

The scheduling engine is covered by Node's built-in test runner. GitHub Actions runs `npm test` for pull requests and the protected development branches.
