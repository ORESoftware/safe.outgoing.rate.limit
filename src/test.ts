import * as http from 'http';
import * as limit from './main';
import * as async from 'async';

const calls: Array<number> = [];

const s = http.createServer((req, res) => {
  
  const now = Date.now();
  calls.push(now);
  
  const ln = calls.length;
  const past = calls[ln - 6];
  
  if (past && (now - past < 1000)) {
    console.error(calls);
    throw new Error('more counties than limit.');
  }
  
  setTimeout(() => {
    res.end('done');
  }, Math.ceil(Math.random() * 7));
  
});

s.listen(5000);

const runLimited = limit.makeLimit(1000, 5);

let reqNum = 0;
let resNum = 0;

const runReq = () => {
  
  console.log('req-num1:', ++reqNum);
  
  runLimited(cb => {
  
    console.log('req-num2:', ++reqNum);
    
    const r = http.get({
      host: 'localhost',
      port: 5000
    }, res => {
      
      res.pipe(process.stdout);
      
      res.once('end', () => {
        console.log('res-num:', ++resNum);
        cb();
        runReq();
      });
      
    });
    
    r.end('foo');
    
  });
  
};

runReq();
runReq();
runReq();
runReq();
runReq();
runReq();
runReq();
runReq();
runReq();
runReq();
runReq();
runReq();
runReq();
runReq();
runReq();

process.once('exit', v => {
  console.log({code: v});
});
