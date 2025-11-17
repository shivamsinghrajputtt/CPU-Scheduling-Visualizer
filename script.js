// Utility helpers
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

// DOM refs
const inpPid = $('inpPid'), inpAT = $('inpAT'), inpBT = $('inpBT'), inpPR = $('inpPR');
const btnAdd = $('btnAdd'), btnClear = $('btnClear'), btnRun = $('btnRun');
const procTableBody = document.querySelector('#procTable tbody');
const algoSel = $('algo'), quantumInput = $('quantum');
const ganttEl = $('gantt'), timeLabelsEl = $('timeLabels');
const solutionEl = $('solution'), resultTbody = document.querySelector('#resultTable tbody');
const averagesEl = $('averages'), btnCsv = $('btnCsv'), btnResetOutput = $('btnResetOutput');

let processes = []; // { pid, arrival, burst, priority }

// show/hide quantum for RR
algoSel.addEventListener('change', () => {
  if (algoSel.value === 'rr') quantumInput.style.display = 'inline-block';
  else quantumInput.style.display = 'none';
});

// add process
btnAdd.addEventListener('click', () => {
  const pid = (inpPid.value || `P${processes.length+1}`).trim();
  const at = Number(inpAT.value);
  const bt = Number(inpBT.value);
  const pr = inpPR.value === '' ? null : Number(inpPR.value);

  const err = validateProcessInput(pid, at, bt, pr);
  if (err) { alert(err); return; }

  processes.push({ pid, arrival: at, burst: bt, priority: pr, remaining: bt });
  renderProcTable();
  inpPid.value = ''; inpAT.value = ''; inpBT.value = ''; inpPR.value = '';
});

// clear all processes
btnClear.addEventListener('click', () => {
  if (!confirm('Clear all processes?')) return;
  processes = [];
  renderProcTable();
  clearOutput();
});

function validateProcessInput(pid, at, bt, pr){
  if(!pid) return 'PID cannot be empty';
  if (!Number.isFinite(at) || at < 0) return 'Arrival Time must be 0 or positive';
  if (!Number.isFinite(bt) || bt <= 0) return 'Burst Time must be positive';
  if (pr !== null && (!Number.isFinite(pr) || pr < 0)) return 'Priority must be non-negative';
  if (processes.some(p=>p.pid === pid)) return 'PID must be unique';
  return null;
}

function renderProcTable(){
  procTableBody.innerHTML = '';
  processes.forEach((p,i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.pid}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${p.priority ?? '-'}</td>
      <td><button class="btn ghost" data-i="${i}">Delete</button></td>`;
    procTableBody.appendChild(tr);
  });
  procTableBody.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => {
      const i = Number(e.currentTarget.dataset.i);
      processes.splice(i,1);
      renderProcTable();
    });
  });
}

// run handler
btnRun.addEventListener('click', () => {
  if (processes.length===0) { alert('Add at least one process'); return; }
  // deep copy
  const list = processes.map(p => ({ ...p, remaining: p.burst, completion:0, turnaround:0, waiting:0, response: null }));
  const algo = algoSel.value;
  const quantum = Math.max(1, Number(quantumInput.value) || 2);

  let schedule = [];
  if (algo === 'fcfs') schedule = fcfs(list);
  else if (algo === 'sjf-non') schedule = sjfNonPreemptive(list);
  else if (algo === 'sjf-pre') schedule = sjfPreemptive(list);
  else if (algo === 'priority') schedule = priorityNonPreemptive(list);
  else if (algo === 'rr') schedule = roundRobin(list, quantum);

  // merge segments with same pid contiguous
  schedule = mergeSegments(schedule);
  // metrics
  const metrics = calculateMetrics(schedule, list);
  // render
  renderGantt(schedule);
  renderSolution(schedule, list, metrics);
  renderResultTable(metrics.results, metrics.avgWaiting, metrics.avgTurnaround, metrics.avgResponse);
});

// ---------- Scheduling Algorithms ----------

// FCFS
function fcfs(procs){
  const list = procs.slice().sort((a,b)=>a.arrival - b.arrival);
  let time = 0, sched = [];
  for (const p of list){
    if (time < p.arrival) time = p.arrival;
    sched.push({ pid: p.pid, start: time, end: time + p.burst });
    time += p.burst;
  }
  return sched;
}

// SJF Non-preemptive
function sjfNonPreemptive(procs){
  const list = procs.map(p => ({...p}));
  let time = 0, sched = [];
  while (list.some(p=>p.completion===0 || p.completion===undefined)){
    const arrived = list.filter(p=> (p.arrival <= time) && !p._done);
    if (arrived.length===0){ time++; continue; }
    arrived.sort((a,b)=>a.burst - b.burst || a.arrival - b.arrival);
    const p = arrived[0];
    sched.push({ pid: p.pid, start: time, end: time + p.burst });
    time += p.burst;
    p._done = true;
  }
  return sched;
}

// SJF Preemptive (SRTF)
function sjfPreemptive(procs){
  const list = procs.map(p=>({...p}));
  const sched = [];
  let time = 0, completed = 0, n = list.length;
  while (completed < n){
    let available = list.filter(p=>p.arrival <= time && p.remaining > 0);
    if (available.length === 0){ time++; continue; }
    available.sort((a,b)=>a.remaining - b.remaining || a.arrival - b.arrival);
    const cur = available[0];
    // run for 1 unit
    const last = sched[sched.length-1];
    if (last && last.pid === cur.pid && last.end === time) { last.end += 1; }
    else sched.push({ pid: cur.pid, start: time, end: time + 1 });
    cur.remaining -= 1;
    if (cur.remaining === 0) completed++;
    time++;
  }
  return sched;
}

// Priority Non-preemptive (lower number = higher priority)
function priorityNonPreemptive(procs){
  const list = procs.map(p=>({...p}));
  let time = 0, sched = [];
  while (list.some(p=>!p._done)){
    const arrived = list.filter(p=>p.arrival <= time && !p._done);
    if (arrived.length === 0){ time++; continue; }
    arrived.sort((a,b)=> ( (a.priority ?? 0) - (b.priority ?? 0) ) || a.arrival - b.arrival);
    const p = arrived[0];
    sched.push({ pid: p.pid, start: time, end: time + p.burst });
    time += p.burst;
    p._done = true;
  }
  return sched;
}

// Round Robin
function roundRobin(procs, q){
  const queue = procs.slice().sort((a,b)=>a.arrival - b.arrival);
  const orig = JSON.parse(JSON.stringify(queue));
  let time = 0, sched = [], i = 0;
  const ready = [];
  while (queue.length > 0 || ready.length > 0){
    while (queue.length > 0 && queue[0].arrival <= time) ready.push(queue.shift());
    if (ready.length === 0){ time++; continue; }
    const p = ready.shift();
    const run = Math.min(q, p.remaining);
    sched.push({ pid: p.pid, start: time, end: time + run });
    p.remaining -= run;
    time += run;
    while (queue.length > 0 && queue[0].arrival <= time) ready.push(queue.shift());
    if (p.remaining > 0) ready.push(p);
    else {
      // mark completion in orig
      const o = orig.find(x=>x.pid===p.pid);
      o.completion = time; o.turnaround = o.completion - o.arrival; o.waiting = o.turnaround - o.burst;
    }
  }
  // ensure processes is orig with completion values
  return sched;
}

// merge contiguous same-pid segments
function mergeSegments(schedule){
  if (!schedule.length) return [];
  const merged = [];
  for (const seg of schedule){
    const last = merged[merged.length-1];
    if (last && last.pid === seg.pid && last.end === seg.start){
      last.end = seg.end;
    } else merged.push({ ...seg });
  }
  return merged;
}

// ---------- Metrics ----------
function calculateMetrics(schedule, procs){
  const resMap = {};
  procs.forEach(p => resMap[p.pid] = { pid:p.pid, arrival:p.arrival, burst:p.burst, start:null, completion:null, response:null });

  schedule.sort((a,b)=>a.start - b.start);
  for (const seg of schedule){
    const r = resMap[seg.pid];
    if (r.start === null) r.start = seg.start;
    if (r.response === null) r.response = r.start - r.arrival;
    r.completion = Math.max(r.completion ?? 0, seg.end);
  }

  const results = Object.values(resMap).map(r => {
    const ct = r.completion;
    const tat = ct - r.arrival;
    const wt = tat - r.burst;
    const response = r.response ?? 0;
    return { pid: r.pid, arrival: r.arrival, burst: r.burst, completion: ct, turnaround: tat, waiting: wt, response };
  });

  const avgWaiting = results.reduce((s,x)=>s+x.waiting,0)/results.length;
  const avgTurnaround = results.reduce((s,x)=>s+x.turnaround,0)/results.length;
  const avgResponse = results.reduce((s,x)=>s+(x.response ?? 0),0)/results.length;

  return { results, avgWaiting, avgTurnaround, avgResponse };
}

// ---------- Rendering ----------

function renderGantt(schedule){
  ganttEl.innerHTML = '';
  timeLabelsEl.innerHTML = '';
  if (!schedule.length) return;

  const startTime = Math.min(...schedule.map(s=>s.start));
  const endTime = Math.max(...schedule.map(s=>s.end));
  const total = endTime - startTime;
  // time labels
  for (let t = startTime; t <= endTime; t++){
    const lbl = document.createElement('div');
    lbl.style.flex = '0 0 auto';
    lbl.style.width = (100/ (total || 1)) + '%';
    lbl.style.textAlign = 'center';
    lbl.textContent = t;
    timeLabelsEl.appendChild(lbl);
  }
  // bars
  schedule.forEach((seg, idx) => {
    const leftPct = ((seg.start - startTime)/total) * 100;
    const widthPct = ((seg.end - seg.start)/total) * 100;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.left = leftPct + '%';
    bar.style.width = widthPct + '%';
    bar.style.background = pickColor(seg.pid);
    bar.style.opacity = '0';
    bar.style.transform = 'translateY(8px)';
    bar.textContent = seg.pid;
    bar.style.bottom = (idx % 2 === 0) ? '18px' : '60px';
    ganttEl.appendChild(bar);
    // animate
    setTimeout(()=>{ bar.style.opacity='1'; bar.style.transform='translateY(0)'; }, idx*160);
  });
}

// pick consistent color per pid
const colorMap = {};
function pickColor(pid){
  if (colorMap[pid]) return colorMap[pid];
  const palette = ['#00f0ff','#7b6aff','#ffb86b','#6aff8a','#8bd5ff','#ff7aa2'];
  const c = palette[Object.keys(colorMap).length % palette.length];
  colorMap[pid] = c;
  return c;
}

// step-by-step solution text
function renderSolution(schedule, procsList, metrics){
  solutionEl.innerHTML = '';
  if (!schedule.length){ solutionEl.textContent = 'No schedule generated.'; return; }

  // Step 1: Order by first start time (unique PIDs)
  const uniqOrder = [];
  schedule.slice().sort((a,b)=>a.start-b.start).forEach(s=>{
    if (!uniqOrder.includes(s.pid)) uniqOrder.push(s.pid);
  });
  const step1 = document.createElement('div'); step1.className='step';
  step1.innerHTML = `<strong>Step 1: Order (by first execution start):</strong><br>At t=${schedule[0].start} → ${uniqOrder.map((p,i)=> (i===0? `${p} starts` : `${p}`)).join(' → ')}.`;
  solutionEl.appendChild(step1);

  // Step 2: Gantt Chart text representation
  const step2 = document.createElement('div'); step2.className='step';
  step2.innerHTML = `<strong>Step 2: Gantt Chart (segments):</strong><pre>${schedule.map(s=>`| ${s.pid} |---- ${s.start} to ${s.end}`).join('\n')}</pre>`;
  solutionEl.appendChild(step2);

  // Step 3: Completion Times
  const compMap = {};
  metrics.results.forEach(r=> compMap[r.pid]=r.completion);
  const step3 = document.createElement('div'); step3.className='step';
  step3.innerHTML = `<strong>Step 3: Completion Time (CT):</strong><br>${metrics.results.map(r=>`${r.pid} = ${r.completion}`).join('<br>')}`;
  solutionEl.appendChild(step3);

  // Step 4: Turnaround calculations
  const step4 = document.createElement('div'); step4.className='step';
  step4.innerHTML = `<strong>Step 4: Turnaround Time (TAT = CT - AT):</strong><br>${metrics.results.map(r=>`${r.pid} = ${r.completion} - ${r.arrival} = ${r.turnaround}`).join('<br>')}`;
  solutionEl.appendChild(step4);

  // Step 5: Waiting Time
  const step5 = document.createElement('div'); step5.className='step';
  step5.innerHTML = `<strong>Step 5: Waiting Time (WT = TAT - BT):</strong><br>${metrics.results.map(r=>`${r.pid} = ${r.turnaround} - ${r.burst} = ${r.waiting}`).join('<br>')}`;
  solutionEl.appendChild(step5);

  // Final answer table preview inside solution
  const final = document.createElement('div'); final.className='step';
  final.innerHTML = `<strong>✅ Final Answer Table:</strong><pre>Process\tAT\tBT\tCT\tTAT\tWT\n${metrics.results.map(r=>`${r.pid}\t${r.arrival}\t${r.burst}\t${r.completion}\t${r.turnaround}\t${r.waiting}`).join('\n')}</pre>`;
  solutionEl.appendChild(final);

  // averages
  const avg = document.createElement('div'); avg.className='step';
  avg.innerHTML = `<strong>Averages:</strong><br>Average TAT = ${(metrics.avgTurnaround).toFixed(2)}  —  Average WT = ${(metrics.avgWaiting).toFixed(2)}`;
  solutionEl.appendChild(avg);
}

// render result table
function renderResultTable(results, avgW, avgT, avgR){
  resultTbody.innerHTML = '';
  results.sort((a,b)=>a.pid.localeCompare(b.pid)).forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.pid}</td><td>${r.arrival}</td><td>${r.burst}</td><td>${r.completion}</td><td>${r.turnaround}</td><td>${r.waiting}</td><td>${r.response}</td>`;
    resultTbody.appendChild(tr);
  });
  averagesEl.textContent = `Average Turnaround Time = ${avgT.toFixed(2)}    |    Average Waiting Time = ${avgW.toFixed(2)}    |    Avg Response = ${avgR.toFixed(2)}`;
}

// CSV download
btnCsv.addEventListener('click', ()=>{
  const rows = [['PID','AT','BT','CT','TAT','WT','Response']];
  document.querySelectorAll('#resultTable tbody tr').forEach(tr=>{
    const cols = Array.from(tr.querySelectorAll('td')).map(td=>td.textContent);
    rows.push(cols);
  });
  const csv = rows.map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'cpu_results.csv'; a.click(); URL.revokeObjectURL(url);
});

// reset output
btnResetOutput.addEventListener('click', ()=> { clearOutput(); });

function clearOutput(){
  ganttEl.innerHTML = ''; timeLabelsEl.innerHTML=''; solutionEl.innerHTML=''; resultTbody.innerHTML=''; averagesEl.textContent='';
  // reset color map to keep colors stable across repeated runs if desired comment next line
  // for (let k in colorMap) delete colorMap[k];
}

