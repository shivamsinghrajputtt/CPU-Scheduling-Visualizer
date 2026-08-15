// Pure CPU scheduling engine.
// This module intentionally has no DOM/browser dependencies so it can be tested independently.

function cloneProcess(process) {
  return {
    pid: process.pid,
    arrival: process.arrival,
    burst: process.burst,
    priority: process.priority ?? null,
    remaining: process.burst,
  };
}

function byArrival(a, b) {
  return a.arrival - b.arrival;
}

/**
 * FCFS: processes are executed in arrival order. The CPU jumps directly
 * to the next arrival when the ready queue is empty.
 */
export function fcfs(processes) {
  const list = processes.map(cloneProcess).sort(byArrival);
  const schedule = [];
  let time = 0;

  for (const process of list) {
    if (time < process.arrival) time = process.arrival;
    schedule.push({ pid: process.pid, start: time, end: time + process.burst });
    time += process.burst;
  }

  return schedule;
}

/** SJF non-preemptive. Lower burst time wins; arrival time breaks ties. */
export function sjfNonPreemptive(processes) {
  const list = processes.map(cloneProcess);
  const schedule = [];
  let time = 0;
  let completed = 0;

  while (completed < list.length) {
    const ready = list
      .filter((p) => !p.done && p.arrival <= time)
      .sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);

    if (ready.length === 0) {
      const nextArrival = Math.min(...list.filter((p) => !p.done).map((p) => p.arrival));
      time = Math.max(time, nextArrival);
      continue;
    }

    const process = ready[0];
    schedule.push({ pid: process.pid, start: time, end: time + process.burst });
    time += process.burst;
    process.done = true;
    completed += 1;
  }

  return schedule;
}

/** SRTF: shortest remaining time first, simulated one time unit at a time. */
export function sjfPreemptive(processes) {
  const list = processes.map(cloneProcess);
  const schedule = [];
  let time = 0;
  let completed = 0;

  while (completed < list.length) {
    const ready = list
      .filter((p) => p.arrival <= time && p.remaining > 0)
      .sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);

    if (ready.length === 0) {
      const nextArrival = Math.min(...list.filter((p) => p.remaining > 0).map((p) => p.arrival));
      time = Math.max(time, nextArrival);
      continue;
    }

    const process = ready[0];
    const last = schedule[schedule.length - 1];

    if (last && last.pid === process.pid && last.end === time) {
      last.end += 1;
    } else {
      schedule.push({ pid: process.pid, start: time, end: time + 1 });
    }

    process.remaining -= 1;
    if (process.remaining === 0) completed += 1;
    time += 1;
  }

  return schedule;
}

/**
 * Priority non-preemptive. Lower number means higher priority.
 * A missing priority is treated as lowest priority (Infinity), so an
 * omitted value never unexpectedly outranks an explicitly prioritised process.
 */
export function priorityNonPreemptive(processes) {
  const list = processes.map(cloneProcess);
  const schedule = [];
  let time = 0;
  let completed = 0;

  while (completed < list.length) {
    const ready = list
      .filter((p) => !p.done && p.arrival <= time)
      .sort(
        (a, b) =>
          (a.priority ?? Number.POSITIVE_INFINITY) - (b.priority ?? Number.POSITIVE_INFINITY) ||
          a.arrival - b.arrival,
      );

    if (ready.length === 0) {
      const nextArrival = Math.min(...list.filter((p) => !p.done).map((p) => p.arrival));
      time = Math.max(time, nextArrival);
      continue;
    }

    const process = ready[0];
    schedule.push({ pid: process.pid, start: time, end: time + process.burst });
    time += process.burst;
    process.done = true;
    completed += 1;
  }

  return schedule;
}

/** Round Robin with FIFO ready queue and configurable quantum. */
export function roundRobin(processes, quantum = 2) {
  const q = Number.isFinite(quantum) && quantum > 0 ? quantum : 1;
  const pending = processes.map(cloneProcess).sort(byArrival);
  const ready = [];
  const schedule = [];
  let time = 0;

  while (pending.length > 0 || ready.length > 0) {
    while (pending.length > 0 && pending[0].arrival <= time) {
      ready.push(pending.shift());
    }

    if (ready.length === 0) {
      time = pending[0].arrival;
      continue;
    }

    const process = ready.shift();
    const run = Math.min(q, process.remaining);
    schedule.push({ pid: process.pid, start: time, end: time + run });
    process.remaining -= run;
    time += run;

    // Processes arriving during the time slice join before the preempted
    // process is re-queued, matching the behaviour of the original app.
    while (pending.length > 0 && pending[0].arrival <= time) {
      ready.push(pending.shift());
    }

    if (process.remaining > 0) ready.push(process);
  }

  return schedule;
}

export function mergeSegments(schedule) {
  if (!schedule.length) return [];

  return schedule.reduce((merged, segment) => {
    const last = merged[merged.length - 1];
    if (last && last.pid === segment.pid && last.end === segment.start) {
      last.end = segment.end;
    } else {
      merged.push({ ...segment });
    }
    return merged;
  }, []);
}

export function calculateMetrics(schedule, processes) {
  const resultMap = new Map(
    processes.map((p) => [
      p.pid,
      {
        pid: p.pid,
        arrival: p.arrival,
        burst: p.burst,
        start: null,
        completion: null,
        response: null,
      },
    ]),
  );

  const sortedSchedule = [...schedule].sort((a, b) => a.start - b.start);

  for (const segment of sortedSchedule) {
    const result = resultMap.get(segment.pid);
    if (!result) continue;
    if (result.start === null) result.start = segment.start;
    if (result.response === null) result.response = result.start - result.arrival;
    result.completion = Math.max(result.completion ?? 0, segment.end);
  }

  const results = [...resultMap.values()].map((result) => {
    if (result.completion === null) {
      throw new Error(`Process ${result.pid} was not scheduled.`);
    }

    const turnaround = result.completion - result.arrival;
    const waiting = turnaround - result.burst;

    return {
      pid: result.pid,
      arrival: result.arrival,
      burst: result.burst,
      completion: result.completion,
      turnaround,
      waiting,
      response: result.response ?? 0,
    };
  });

  const count = results.length;
  const average = (field) =>
    count === 0 ? 0 : results.reduce((sum, item) => sum + item[field], 0) / count;

  return {
    results,
    avgWaiting: average('waiting'),
    avgTurnaround: average('turnaround'),
    avgResponse: average('response'),
  };
}

export function runScheduling(processes, algorithm, quantum = 2) {
  if (!Array.isArray(processes) || processes.length === 0) {
    throw new Error('At least one process is required.');
  }

  let schedule;
  switch (algorithm) {
    case 'fcfs':
      schedule = fcfs(processes);
      break;
    case 'sjf-non':
      schedule = sjfNonPreemptive(processes);
      break;
    case 'sjf-pre':
      schedule = sjfPreemptive(processes);
      break;
    case 'priority':
      schedule = priorityNonPreemptive(processes);
      break;
    case 'rr':
      schedule = roundRobin(processes, quantum);
      break;
    default:
      throw new Error(`Unsupported scheduling algorithm: ${algorithm}`);
  }

  return mergeSegments(schedule);
}
