'use strict';

import {LinkedQueue} from "@oresoftware/linked-queue";
import * as async from 'async';

export const r2gSmokeTest = function () {
  // r2g command line app uses this exported function
  return true;
};

export type EVCb<T> = (err: any, val?: T) => void
type Task = (cb: EVCb<any>) => void

export interface QueueItem {
  started: number,
  ended?: number
}

export const makeLimit = (millis: number, count: number) => {
  
  const q = async.queue<Task>((task, cb) => task(cb), count + 1);
  const queuedTasks = new LinkedQueue<EVCb<any>>();
  let running = 0;
  
  return (cb: EVCb<any>) => {
    
    running++;
    
    if (running > count) {
      return queuedTasks.enqueue(cb);
    }
    
    q.push(cb, () => {
      
      running--;
      
      console.log('len:', queuedTasks.length);
      
      const v = queuedTasks.dequeue();
      
      if (!v) {
        throw 'no queue item';
        return;
      }
      
      q.push(cb => {
        setTimeout(() => {
          v.value(cb);
        }, millis);
      });
      
    });
    
  }
  
};

export const makeLimit2 = (millis: number, count: number) => {
  
  const q = async.queue<Task>((task, cb) => task(cb), count);
  const queuedTasks = new LinkedQueue<EVCb<any>>();
  const runningTasks = new LinkedQueue<QueueItem>();
  
  let index = 0;
  
  const enq = (cb: EVCb<any>, i: number) => {
    q.push(cb, (err, val) => {
      
      const {value} = runningTasks.get(i);
      const now = value.ended = Date.now();
      const p = queuedTasks.dequeue();
      
      if (!p) {
        return;
      }
      
    });
  };
  
  return (cb: EVCb<any>) => {
    
    const i = index++;
    const now = Date.now();
    
    let curr = runningTasks.last();
    let c = 0;
    
    while (curr) {
      const ended = curr.value.ended;
      if (ended && (now - ended > millis)) {
        runningTasks.remove(curr.key);
      }
      else {
        c++;
      }
      curr = curr.before;
    }
    
    if (c > count - 1) {
      queuedTasks.enqueue(i, cb);
      return;
    }
    
    runningTasks.add(i, {started: now});
    enq(cb, i);
    
  };
  
};

const previousRequestTimestamps: Array<number> = [];
const timeInterval = 10000;
const maxCount = 3;

const isWithinTheLimit = (cb: any) => {
  
  const d = Date.now();
  let count = 0;
  let len = previousRequestTimestamps.length;
  let timeOfOldest = null;
  let weNeedToDelay = false;
  
  let i = len - 1;
  const diff = d - timeInterval;
  
  for (i; i >= 0; i--) {
    
    const t = previousRequestTimestamps[i];
    
    if (t > diff) {
      
      count++;
      timeOfOldest = t;
      
      if (count > maxCount) {
        weNeedToDelay = true;
        break;
      }
      
      continue;
    }
    
    break;
  }
  
  for (let z = 0; z < i; z++) {
    // remove everything older than 1 second or 5th oldest entry
    previousRequestTimestamps.shift();
  }
  
  previousRequestTimestamps.push(d);
  
  if (weNeedToDelay) {
    
    if (d - timeOfOldest > timeInterval) {
      throw 'bad';
    }
    
    console.log("WE ARE EN-QUEUEING");
    setTimeout(cb, timeInterval - (d - timeOfOldest));
    return;
  }
  
  // zalgo, but it's ok for now
  cb(null);
  
};

