import {
  calculateMetrics,
  runScheduling,
} from './src/scheduling.js';

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
const ganttEl = $('gantt');
const timeLabelsEl = $('timeLabels');
const solutionEl = $('solution');
const resultTbody = document.querySelector('#resultTable tbody');
const averagesEl = $('averages');
const btnCsv = $('btnCsv');
const btnResetOutput = $('btnResetOutput');

let processes = [];
const colorMap = Object.create(null);

algoSel.addEventListener('change', () => {
  quantumInput.style.display = algoSel.value === 'rr' ? 'inline-block' : 'none';
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
  if (!Number.isFinite(arrival) || arrival < 0) return 'Arrival Time must be 0 or positive';
  if (!Number.isFinite(burst) || burst <= 0) return 'Burst Time must be positive';
  if (priority !== null && (!Number.isFinite(priority) || priority < 0)) {
    return 'Priority must be non-negative';
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

function renderGantt(schedule) {
  ganttEl.replaceChildren();
  timeLabelsEl.replaceChildren();
  if (!schedule.length) return;

  const startTime = Math.min(...schedule.map((segment) => segment.start));
  const endTime = Math.max(...schedule.map((segment) => segment.end));
  const total = Math.max(1, endTime - startTime);

  for (let time = startTime; time <= endTime; time += 1) {
    const label = document.createElement('div');
    label.style.flex = '0 0 auto';
    label.style.width = `${100 / total}%`;
    label.style.textAlign = 'center';
    label.textContent = String(time);
    timeLabelsEl.appendChild(label);
  }

  schedule.forEach((segment, index) => {
    const bar = document.createElement('div');
    const left = ((segment.start - startTime) / total) * 100;
    const width = ((segment.end - segment.start) / total) * 100;

    bar.className = 'bar';
    bar.style.left = `${left}%`;
    bar.style.width = `${width}%`;
    bar.style.background = pickColor(segment.pid);
    bar.style.opacity = '0';
    bar.style.transform = 'translateY(8px)';
    bar.textContent = segment.pid;
    bar.style.bottom = index % 2 === 0 ? '18px' : '60px';
    ganttEl.appendChild(bar);

    setTimeout(() => {
      bar.style.opacity = '1';
      bar.style.transform = 'translateY(0)';
    }, index * 120);
  });
}

function pickColor(pid) {
  if (colorMap[pid]) return colorMap[pid];
  const palette = ['#00f0ff', '#7b6aff', '#ffb86b', '#6aff8a', '#8bd5ff', '#ff7aa2'];
  colorMap[pid] = palette[Object.keys(colorMap).length % palette.length];
  return colorMap[pid];
}

function renderSolution(schedule, metrics) {
  solutionEl.replaceChildren();
  if (!schedule.length) {
    solutionEl.textContent = 'No schedule generated.';
    return;
  }

  addSolutionStep('Step 1: Execution order', schedule.map((segment) =>
    `${segment.pid}: ${segment.start} → ${segment.end}`,
  ).join(' | '));

  addSolutionStep('Step 2: Gantt Chart', schedule.map((segment) =>
    `| ${segment.pid} | ${segment.start} to ${segment.end}`,
  ).join('\n'), true);

  addSolutionStep('Step 3: Completion Time (CT)', metrics.results
    .map((result) => `${result.pid} = ${result.completion}`).join('\n'), true);

  addSolutionStep('Step 4: Turnaround Time (TAT = CT - AT)', metrics.results
    .map((result) => `${result.pid} = ${result.completion} - ${result.arrival} = ${result.turnaround}`).join('\n'), true);

  addSolutionStep('Step 5: Waiting Time (WT = TAT - BT)', metrics.results
    .map((result) => `${result.pid} = ${result.turnaround} - ${result.burst} = ${result.waiting}`).join('\n'), true);

  addSolutionStep('Averages',
    `Average TAT = ${metrics.avgTurnaround.toFixed(2)} | Average WT = ${metrics.avgWaiting.toFixed(2)} | Avg Response = ${metrics.avgResponse.toFixed(2)}`,
  );
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
}

renderProcTable();
quantumInput.style.display = 'none';
