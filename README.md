# ⚡ CPU Scheduling Visualizer

> An interactive CPU scheduling simulator that turns Operating Systems scheduling algorithms into an easy-to-understand visual experience.

[![Tests](https://github.com/shivamsinghrajputtt/CPU-Scheduling-Visualizer/actions/workflows/test.yml/badge.svg)](https://github.com/shivamsinghrajputtt/CPU-Scheduling-Visualizer/actions/workflows/test.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-00f0ff?logo=github)](https://shivamsinghrajputtt.github.io/CPU-Scheduling-Visualizer/)

**[🚀 Live Demo](https://shivamsinghrajputtt.github.io/CPU-Scheduling-Visualizer/)** · **Portfolio project · HTML · CSS · JavaScript · Node.js tests · GitHub Actions · GitHub Pages**

## ✨ What it does

Enter processes, choose a scheduling algorithm, and generate an interactive Gantt timeline with step-by-step decisions and scheduling metrics.

### Supported algorithms

| Algorithm | Type | Key rule |
|---|---|---|
| FCFS | Non-preemptive | Earliest arrival first |
| SJF | Non-preemptive | Shortest burst among ready processes |
| SRTF | Preemptive | Shortest remaining time |
| Priority | Non-preemptive | Lowest numeric priority first |
| Round Robin | Preemptive | FIFO ready queue + time quantum |

## 🚀 Features

- Interactive process input with validation
- Arrival Time (AT), Burst Time (BT) and optional Priority
- CPU idle-period visualization
- Interactive Gantt chart with execution timing
- Algorithm-specific step-by-step explanations
- Completion, Turnaround, Waiting and Response Time
- Average scheduling metrics
- CSV export of results
- Keyboard-focusable controls and reduced-motion support
- Safe DOM rendering for user-provided process IDs
- Automated scheduling tests and GitHub Actions CI
- Live deployment on GitHub Pages

## 🧮 Scheduling metrics

- **Completion Time (CT):** time at which a process finishes.
- **Turnaround Time (TAT):** `CT - AT`
- **Waiting Time (WT):** `TAT - BT`
- **Response Time (RT):** first CPU start time minus arrival time.

## 🏗️ Architecture

The scheduling engine is intentionally separated from browser rendering so the core algorithms can be tested without a DOM.

```text
User Input
   ↓
script.js (UI/controller)
   ↓
src/scheduling.js (pure scheduling engine)
   ↓
Schedule segments
   ├── Gantt timeline
   ├── Step-by-step explanation
   ├── CT / TAT / WT / RT metrics
   └── CSV export
```

See [`docs/architecture.md`](docs/architecture.md) for the detailed data flow and design decisions.

## 🛠️ Tech stack

- HTML5
- CSS3
- Modern JavaScript (ES Modules)
- Node.js built-in test runner
- GitHub Actions
- GitHub Pages

## 📁 Project structure

```text
.
├── index.html
├── style.css
├── script.js
├── package.json
├── src/
│   └── scheduling.js      # Pure scheduling engine + metrics
├── tests/                 # Algorithm correctness tests
├── docs/
│   └── architecture.md   # Architecture and data flow
└── .github/
    └── workflows/
        ├── test.yml      # CI test workflow
        └── deploy.yml    # GitHub Pages deployment
```

## 💻 Run locally

Because the app uses JavaScript ES modules, serve the repository through a local HTTP server instead of opening `index.html` directly with `file://`.

### Python

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

### Node.js

```bash
npx serve .
```

## 🧪 Tests

Install Node.js 20+ and run:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Every pull request is validated by GitHub Actions before the change is considered ready for merge.

## 🌐 Deployment

The repository uses GitHub Pages with a GitHub Actions deployment workflow. Every update to `main` can publish the static site through the repository's Pages environment.

**Live demo:** https://shivamsinghrajputtt.github.io/CPU-Scheduling-Visualizer/

## 📸 Screenshots

Screenshots can be added here after capturing the final live UI for the portfolio.

## 🎯 Why I built it

CPU scheduling is often taught as tables and formulas. This project makes the execution order visible, so learners can connect algorithm rules with the resulting Gantt chart and performance metrics.

## 🔮 Roadmap

- Play/pause simulation animation
- Visual ready-queue state during execution
- More scheduling algorithms
- Test coverage reporting
- Portfolio screenshots

## 👨‍💻 Author

**Shivam Kumar Singh**

Built as a learning-focused Computer Science project combining Operating Systems concepts with practical frontend engineering.
