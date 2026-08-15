import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateMetrics,
  fcfs,
  priorityNonPreemptive,
  roundRobin,
  sjfNonPreemptive,
  sjfPreemptive,
} from '../src/scheduling.js';

const processes = [
  { pid: 'P1', arrival: 0, burst: 5, priority: 2 },
  { pid: 'P2', arrival: 1, burst: 3, priority: 1 },
  { pid: 'P3', arrival: 2, burst: 1, priority: 3 },
];

test('FCFS schedules by arrival order and handles CPU idle time', () => {
  const schedule = fcfs([
    { pid: 'P1', arrival: 2, burst: 3 },
    { pid: 'P2', arrival: 5, burst: 2 },
  ]);

  assert.deepEqual(schedule, [
    { pid: 'P1', start: 2, end: 5 },
    { pid: 'P2', start: 5, end: 7 },
  ]);
});

test('SJF non-preemptive chooses the shortest ready process', () => {
  const schedule = sjfNonPreemptive(processes);
  assert.deepEqual(schedule, [
    { pid: 'P1', start: 0, end: 5 },
    { pid: 'P3', start: 5, end: 6 },
    { pid: 'P2', start: 6, end: 9 },
  ]);
});

test('SRTF preempts when a shorter process arrives', () => {
  const schedule = sjfPreemptive([
    { pid: 'P1', arrival: 0, burst: 8 },
    { pid: 'P2', arrival: 1, burst: 2 },
  ]);

  assert.deepEqual(schedule, [
    { pid: 'P1', start: 0, end: 1 },
    { pid: 'P2', start: 1, end: 3 },
    { pid: 'P1', start: 3, end: 10 },
  ]);
});

test('Priority scheduling treats lower numeric priority as higher priority', () => {
  const schedule = priorityNonPreemptive(processes);
  assert.deepEqual(schedule, [
    { pid: 'P1', start: 0, end: 5 },
    { pid: 'P2', start: 5, end: 8 },
    { pid: 'P3', start: 8, end: 9 },
  ]);
});

test('Missing priority does not outrank an explicitly prioritised process', () => {
  const schedule = priorityNonPreemptive([
    { pid: 'P1', arrival: 0, burst: 2, priority: null },
    { pid: 'P2', arrival: 0, burst: 2, priority: 1 },
  ]);

  assert.deepEqual(schedule, [
    { pid: 'P2', start: 0, end: 2 },
    { pid: 'P1', start: 2, end: 4 },
  ]);
});

test('Round Robin follows FIFO ready-queue order', () => {
  const schedule = roundRobin([
    { pid: 'P1', arrival: 0, burst: 5 },
    { pid: 'P2', arrival: 0, burst: 3 },
    { pid: 'P3', arrival: 1, burst: 1 },
  ], 2);

  assert.deepEqual(schedule, [
    { pid: 'P1', start: 0, end: 2 },
    { pid: 'P2', start: 2, end: 4 },
    { pid: 'P3', start: 4, end: 5 },
    { pid: 'P1', start: 5, end: 7 },
    { pid: 'P2', start: 7, end: 8 },
    { pid: 'P1', start: 8, end: 9 },
  ]);
});

test('Metrics calculate CT, TAT, WT and response time correctly', () => {
  const schedule = [
    { pid: 'P1', start: 0, end: 5 },
    { pid: 'P2', start: 5, end: 8 },
  ];
  const result = calculateMetrics(schedule, [
    { pid: 'P1', arrival: 0, burst: 5 },
    { pid: 'P2', arrival: 1, burst: 3 },
  ]);

  assert.deepEqual(result.results, [
    { pid: 'P1', arrival: 0, burst: 5, completion: 5, turnaround: 5, waiting: 0, response: 0 },
    { pid: 'P2', arrival: 1, burst: 3, completion: 8, turnaround: 7, waiting: 4, response: 4 },
  ]);
  assert.equal(result.avgWaiting, 2);
  assert.equal(result.avgTurnaround, 6);
  assert.equal(result.avgResponse, 2);
});

test('Metrics support preemptive schedules and use first start for response time', () => {
  const result = calculateMetrics([
    { pid: 'P1', start: 0, end: 1 },
    { pid: 'P2', start: 1, end: 3 },
    { pid: 'P1', start: 3, end: 10 },
  ], [
    { pid: 'P1', arrival: 0, burst: 8 },
    { pid: 'P2', arrival: 1, burst: 2 },
  ]);

  assert.equal(result.results.find((p) => p.pid === 'P1').completion, 10);
  assert.equal(result.results.find((p) => p.pid === 'P1').response, 0);
  assert.equal(result.results.find((p) => p.pid === 'P1').waiting, 2);
});
