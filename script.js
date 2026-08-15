import { calculateMetrics, runScheduling } from './src/scheduling.js';

const $ = (id) => document.getElementById(id);

const inpPid = $('inpPid');
const inpAT = $('inpAT');
const inpBT = $('inpBT');
const inpPR = $('inpPR');
const btnAdd = $('btnAdd');
const btnClear = $('btnClear');
const btnRun = $('btnRun');
const procTableBody = document.querySelector('#procTable tbody');
const algoSel = $('algo');
const quantumInput = $('quantum');
const algorithmInfo = $('algorithmInfo');
const ganttEl = $('gantt');
const timeLabelsEl = $('timeLabels');
const solutionEl = $('solution');
const resultTbody = document.querySelector('#resultTable tbody');
const averagesEl = $('averages');
const btnCsv = $('btnCsv');
const btnResetOutput = $('btnResetOutput');

let processes = [];
const colorMap = Object.create(null);

const algorithmMeta = {
  fcfs: {
    name: 'FCFS',
    rule: 'First Come First Serve: the process with the earliest arrival runs first. Once started, it runs to completion.',
  },
  'sjf-non': {
    name: 'SJF — Non-Preemptive',
    rule: 'Among ready processes, choose the shortest burst time. The selected process runs until completion.',
  },
  'sjf-pre': {
    name: 'SRTF — Preemptive SJF',
    rule: 'At each time unit, choose the process with the shortest remaining time. A new shorter arrival can preempt the current process.',
  },
  priority: {
    name: 'Priority — Non-Preemptive',
    rule: 'Among ready processes, choose the lowest numeric priority. Blank priority is treated as lowest priority.',
  },
  rr: {
    name: 'Round Robin',
    rule: 'Processes share the CPU in FIFO order. Each process receives one time quantum before returning to the ready queue.',
  },
};

algoSel.addEventListener('change', () => {
  quantumInput.style.display = algoSel.value === 'rr' ? 'inline-block' : 'none';
  renderAlgorithmInfo();
});

btnAdd.addEventListener('click', addProcess);
btnClear.addEventListener('click', () => {
  if (!confirm('Clear all processes?')) return;
  processes = [];
  renderProcTable();
  clearOutput();
});

btnRun.addEventListener('click', () => {
  if (processes.length === 0) {
    alert('Add at least one process');
    return;
  }

  try {
    const schedule = runScheduling(
      processes,
      algoSel.value,
      Math.max(1, Number(quantumInput.value) || 2),
    );
    const metrics = calculateMetrics(schedule, processes);

    renderGantt(schedule);
    renderSolution(schedule, metrics);
    renderResultTable(metrics.results, metrics.avgWaiting, metrics.avgTurnaround, metrics.avgResponse);
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Unable to run scheduling.');
  }
});

btnResetOutput.addEventListener('click', clearOutput);

btnCsv.addEventListener('click', () => {
  const rows = [['PID', 'AT', 'BT', 'CT', 'TAT', 'WT', 'Response']];
  document.querySelectorAll('#resultTable tbody tr').forEach((tr) => {
    rows.push([...tr.querySelectorAll('td')].map((td) => td.textContent ?? ''));
  });

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'cpu_results.csv';
  anchor.click();
  URL.revokeObjectURL(url);
});

function addProcess() {
  const pid = (inpPid.value || `P${processes.length + 1}`).trim();
  const at = Number(inpAT.value);
  const bt = Number(inpBT.value);
  const priority = inpPR.value === '' ? null : Number(inpPR.value);

  const error = validateProcessInput(pid, at, bt, priority);
  if (error) {
    alert(error);
    return;
  }

  processes.push({ pid, arrival: at, burst: bt, priority });
  renderProcTable();
  inpPid.value = '';
  inpAT.value = '';
  inpBT.value = '';
  inpPR.value = '';
  inpPid.focus();
}

function validateProcessInput(pid, arrival, burst, priority) {
  if (!pid) return 'PID cannot be empty';
  if (!Number.isInteger(arrival) || arrival < 0) return 'Arrival Time must be a non-negative integer';
  if (!Number.isInteger(burst) || burst <= 0) return 'Burst Time must be a positive integer';
  if (priority !== null && (!Number.isInteger(priority) || priority < 0)) {
    return 'Priority must be a non-negative integer';
  }
  if (processes.some((process) => process.pid === pid)) return 'PID must be unique';
  return null;
}

function renderProcTable() {
  procTableBody.replaceChildren();

  processes.forEach((process, index) => {
    const tr = document.createElement('tr');
    appendCell(tr, process.pid);
    appendCell(tr, process.arrival);
    appendCell(tr, process.burst);
    appendCell(tr, process.priority ?? '-');

    const actionCell = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'btn ghost';
    button.textContent = 'Delete';
    button.addEventListener('click', () => {
      processes.splice(index, 1);
      renderProcTable();
      clearOutput();
    });
    actionCell.appendChild(button);
    tr.appendChild(actionCell);
    procTableBody.appendChild(tr);
  });
}

function appendCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = String(value);
  row.appendChild(cell);
}

function buildTimeline(schedule) {
  if (!schedule.length) return [];

  const timeline = [];
  let cursor = schedule[0].start;

  for (const segment of schedule) {
    if (segment.start > cursor) {
      timeline.push({ pid: 'IDLE', start: cursor, end: segment.start, idle: true });
    }
    timeline.push({ ...segment, idle: false });
    cursor = segment.end;
  }

  return timeline;
}

function renderGantt(schedule) {
  ganttEl.replaceChildren();
  timeLabelsEl.replaceChildren();
  if (!schedule.length) return;

  const timeline = buildTimeline(schedule);
  const startTime = timeline[0].start;
  const endTime = timeline[timeline.length - 1].end;
  const total = Math.max(1, endTime - startTime);

  ganttEl.setAttribute('aria-label', `CPU timeline from ${startTime} to ${endTime}`);

  const boundaries = [...new Set(timeline.flatMap((segment) => [segment.start, segment.end]))].sort((a, b) => a - b);
  boundaries.forEach((time) => {
    const label = document.createElement('span');
    label.textContent = String(time);
    label.style.left = `${((time - startTime) / total) * 100}%`;
    label.className = 'time-label';
    timeLabelsEl.appendChild(label);
  });

  timeline.forEach((segment, index) => {
    const bar = document.createElement('button');
    const left = ((segment.start - startTime) / total) * 100;
    const width = ((segment.end - segment.start) / total) * 100;
    const duration = segment.end - segment.start;
    const label = segment.idle ? 'CPU IDLE' : segment.pid;

    bar.type = 'button';
    bar.className = `bar${segment.idle ? ' idle-bar' : ''}`;
    bar.style.left = `${left}%`;
    bar.style.width = `${width}%`;
    bar.style.background = segment.idle ? '#566176' : pickColor(segment.pid);
    bar.textContent = label;
    bar.title = `${label}: ${segment.start} → ${segment.end} (${duration} time unit${duration === 1 ? '' : 's'})`;
    bar.setAttribute('aria-label', bar.title);

    bar.addEventListener('mouseenter', () => showTimelineDetail(segment));
    bar.addEventListener('focus', () => showTimelineDetail(segment));
    bar.addEventListener('click', () => showTimelineDetail(segment));

    ganttEl.appendChild(bar);

    requestAnimationFrame(() => {
      setTimeout(() => bar.classList.add('visible'), index * 100);
    });
  });
}

function showTimelineDetail(segment) {
  const duration = segment.end - segment.start;
  if (segment.idle) {
    algorithmInfo.innerHTML = '<strong>CPU Idle</strong> — no process had arrived during this interval.';
    return;
  }

  const process = processes.find((item) => item.pid === segment.pid);
  const burst = process?.burst ?? '—';
  algorithmInfo.innerHTML = `<strong>${escapeHtml(segment.pid)}</strong> executed from <strong>${segment.start}</strong> to <strong>${segment.end}</strong> for <strong>${duration}</strong> time unit${duration === 1 ? '' : 's'} · Burst Time: <strong>${burst}</strong>`;
}

function pickColor(pid) {
  if (colorMap[pid]) return colorMap[pid];
  const palette = ['#00f0ff', '#7b6aff', '#ffb86b', '#6aff8a', '#8bd5ff', '#ff7aa2'];
  colorMap[pid] = palette[Object.keys(colorMap).length % palette.length];
  return colorMap[pid];
}

function renderAlgorithmInfo() {
  const meta = algorithmMeta[algoSel.value];
  if (!meta) return;
  algorithmInfo.innerHTML = `<strong>${meta.name}</strong> — ${escapeHtml(meta.rule)}`;
}

function renderSolution(schedule, metrics) {
  solutionEl.replaceChildren();
  if (!schedule.length) {
    solutionEl.textContent = 'No schedule generated.';
    return;
  }

  const timeline = buildTimeline(schedule);
  const meta = algorithmMeta[algoSel.value];
  addSolutionStep(`Algorithm: ${meta.name}`, meta.rule);

  timeline.forEach((segment, index) => {
    if (segment.idle) {
      addSolutionStep(`Step ${index + 1}: CPU idle`, `No process is ready from t=${segment.start} to t=${segment.end}. The simulator jumps directly to the next arrival.`);
      return;
    }

    const process = processes.find((item) => item.pid === segment.pid);
    const ready = getReadyProcesses(segment.start, segment.pid);
    const decision = explainDecision(segment, ready, process);
    addSolutionStep(
      `Step ${index + 1}: ${segment.pid} executes`,
      `t=${segment.start} → ${segment.end} · ${decision}`,
    );
  });

  addSolutionStep('Completion Time (CT)', metrics.results
    .map((result) => `${result.pid} = ${result.completion}`).join('\n'), true);

  addSolutionStep('Turnaround Time (TAT = CT - AT)', metrics.results
    .map((result) => `${result.pid} = ${result.completion} - ${result.arrival} = ${result.turnaround}`).join('\n'), true);

  addSolutionStep('Waiting Time (WT = TAT - BT)', metrics.results
    .map((result) => `${result.pid} = ${result.turnaround} - ${result.burst} = ${result.waiting}`).join('\n'), true);

  addSolutionStep('Response Time (RT = first start - AT)', metrics.results
    .map((result) => `${result.pid} = ${result.response}`).join('\n'), true);

  addSolutionStep('Averages',
    `Average TAT = ${metrics.avgTurnaround.toFixed(2)} | Average WT = ${metrics.avgWaiting.toFixed(2)} | Avg Response = ${metrics.avgResponse.toFixed(2)}`,
  );
}

function getReadyProcesses(time, selectedPid) {
  return processes
    .filter((process) => process.arrival <= time)
    .map((process) => process.pid)
    .filter((pid) => pid !== selectedPid);
}

function explainDecision(segment, ready, process) {
  if (!process) return 'Selected process is not present in the input list.';
  if (algoSel.value === 'fcfs') return `FCFS selects the earliest-arriving ready process. Ready before selection: ${ready.length ? ready.join(', ') : 'none'}.`;
  if (algoSel.value === 'sjf-non') return `SJF selects the shortest burst among ready processes. ${process.pid} has BT=${process.burst}.`;
  if (algoSel.value === 'sjf-pre') return `SRTF selects the shortest remaining time. ${process.pid} is the process executing in this interval.`;
  if (algoSel.value === 'priority') return `Priority scheduling selects the lowest numeric priority. ${process.pid} has priority=${process.priority ?? 'blank/lowest'}.`;
  if (algoSel.value === 'rr') return `Round Robin gives ${process.pid} a time slice of up to ${Math.max(1, Number(quantumInput.value) || 2)} units before returning it to the ready queue.`;
  return '';
}

function addSolutionStep(title, content, preformatted = false) {
  const step = document.createElement('div');
  step.className = 'step';

  const heading = document.createElement('strong');
  heading.textContent = title;
  step.appendChild(heading);

  if (preformatted) {
    const pre = document.createElement('pre');
    pre.textContent = content;
    step.appendChild(pre);
  } else {
    const text = document.createElement('div');
    text.textContent = content;
    step.appendChild(text);
  }

  solutionEl.appendChild(step);
}

function renderResultTable(results, avgWaiting, avgTurnaround, avgResponse) {
  resultTbody.replaceChildren();

  [...results]
    .sort((a, b) => a.pid.localeCompare(b.pid))
    .forEach((result) => {
      const tr = document.createElement('tr');
      appendCell(tr, result.pid);
      appendCell(tr, result.arrival);
      appendCell(tr, result.burst);
      appendCell(tr, result.completion);
      appendCell(tr, result.turnaround);
      appendCell(tr, result.waiting);
      appendCell(tr, result.response);
      resultTbody.appendChild(tr);
    });

  averagesEl.textContent =
    `Average Turnaround Time = ${avgTurnaround.toFixed(2)} | ` +
    `Average Waiting Time = ${avgWaiting.toFixed(2)} | ` +
    `Avg Response = ${avgResponse.toFixed(2)}`;
}

function clearOutput() {
  ganttEl.replaceChildren();
  timeLabelsEl.replaceChildren();
  solutionEl.replaceChildren();
  resultTbody.replaceChildren();
  averagesEl.textContent = '';
  renderAlgorithmInfo();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

renderProcTable();
quantumInput.style.display = 'none';
renderAlgorithmInfo();
