function A1(){return require("fs")}
function C2(){return process.env.CLAUDE_CONFIG_DIR}
function S3(){return Z9.sessionId}
if(A1().existsSync(J0(C2(),"history.jsonl"))){A1().readFileSync(J0(C2(),"history.jsonl"),"utf8")}
A1().writeFileSync(J0(C2(),"todos"),"[]")
if(B1().existsSync("/tmp/noise")){}
