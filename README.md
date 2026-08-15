# ⚡ CPU Scheduling Visualizer

> An interactive CPU scheduling simulator that turns Operating Systems scheduling algorithms into an easy-to-understand visual experience.

**Status:** Portfolio project · **Stack:** HTML, CSS, JavaScript · **Tests:** Node.js built-in test runner

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

## 🧮 Scheduling metrics

- **Completion Time (CT):** time at which a process finishes.
- **Turnaround Time (TAT):** `CT - AT`
- **Waiting Time (WT):** `TAT - BT`
- **Response Time (RT):** first CPU start time minus arrival time.

## 🛠️ Tech stack

- HTML5
- CSS3
- Modern JavaScript (ES Modules)
- Node.js built-in test runner
- GitHub Actions

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
        └── test.yml      # CI test workflow
```

See [Architecture](docs/architecture.md) for the design and data flow.

## 💻 Run locally

Because the app uses JavaScript ES modules, serve the repository through a local HTTP server instead of opening `index.html` directly with `file://`.

### Option 1 — Python

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in your browser.

### Option 2 — Node.js

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

GitHub Actions runs the test suite automatically for pull requests and development branches.

## 📸 Screenshots

_Add screenshots of the process input, Gantt chart and step-by-step solution here after the next UI review._

## 🎯 Why I built it

CPU scheduling is often taught as tables and formulas. This project makes the execution order visible, so learners can connect algorithm rules with the resulting Gantt chart and performance metrics.

## 🔮 Future improvements

- Play/pause simulation animation
- Visual ready-queue state during execution
- More scheduling algorithms
- Test coverage reporting
- Production deployment with a live demo

## 👨‍💻 Author

**Shivam Kumar Singh**

Built as a learning-focused Computer Science project combining Operating Systems concepts with practical frontend engineering.

---

⭐ If this project helps you understand CPU scheduling, consider starring the repository.
