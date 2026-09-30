/* ===== 1. SPA ROUTER & MENU LOGIC ===== */

// Toggle Menu Open/Close (Clicking the hamburger opens/closes it)
function toggleMenu(e) {
    if (e) e.stopPropagation(); 
    const menu = document.getElementById('nav-links');
    const toggle = document.getElementById('mobile-menu');
    menu.classList.toggle('show');
    toggle.classList.toggle('active');
}

// Close menu when clicking anywhere outside of it
document.addEventListener('click', function(e) {
    const menu = document.getElementById('nav-links');
    const toggle = document.getElementById('mobile-menu');
    if (menu.classList.contains('show') && !menu.contains(e.target)) {
        menu.classList.remove('show');
        toggle.classList.remove('active');
    }
});

function navigateTo(sectionId) {
    // Hide all sections
    document.querySelectorAll('.page-section').forEach(sec => {
        sec.classList.remove('active');
    });
    // Show target section
    const target = document.getElementById(sectionId);
    if(target) {
        target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Redraw canvas if navigating to lab
        if(sectionId === 'lab') {
            setTimeout(() => { draw(); renderAll(); }, 100);
        }
    }
    // Note: The auto-close logic has been removed so the menu stays open!
}

/* ===== 2. CORE ALGORITHMIC MODEL ===== */
const N = 13, CTR = 6;
const START = [6, 0], GOAL = [6, 6];
const GATES = [[1,6],[11,3],[3,4],[6,9],[7,6],[6,5]];
// Hazards mapping to cell coordinates
const HAZARDS = {
  "0,1":3,"0,2":3,"0,3":3,"0,4":3,"0,5":3,"0,6":3,"1,6":6,"2,5":3,"3,4":6,"5,4":3,
  "10,2":3,"11,3":3,"6,10":3,"7,10":3,"6,9":6,"8,7":3,"7,6":6,"6,5":3,
  "3,2":3,"5,0":3,"4,0":3
};
const SECTORS = [
  { id:"A", name:"Outer wheel",  threat:9, cost:5 },
  { id:"B", name:"Middle wheel", threat:7, cost:3 },
  { id:"C", name:"Inner wheel",  threat:5, cost:2 },
  { id:"D", name:"Heart",        threat:2, cost:2 }
];
const RESOURCES = 10;
const WEIGHTS = { efficiency:0.4, risk:0.3, resources:0.2, coordination:0.1 };
const EXPO_REF = 40;

const ringOf = (r,c) => Math.max(Math.abs(r-CTR), Math.abs(c-CTR));
function sectorOf(r,c){
  const d = ringOf(r,c);
  if (d >= 5) return "A";
  if (d >= 3) return "B";
  if (d === 2) return "C";
  return "D";
}

function buildGrid(){
  const gate = new Set(GATES.map(g => g.join(",")));
  const g = [];
  for (let r=0;r<N;r++){
    g.push([]);
    for (let c=0;c<N;c++){
      const d = ringOf(r,c);
      const wall = (d===5 || d===3 || d===1) && !gate.has(r+","+c);
      g[r].push({ wall, w: wall ? 0 : (HAZARDS[r+","+c] || 1) });
    }
  }
  return g;
}

const DIRS = [[-1,0],[0,1],[1,0],[0,-1]];
function neighbours(grid,r,c){
  const out = [];
  for (const [dr,dc] of DIRS){
    const nr=r+dr, nc=c+dc;
    if (nr>=0 && nr<N && nc>=0 && nc<N && !grid[nr][nc].wall) out.push([nr,nc]);
  }
  return out;
}
const K = (r,c) => r*N+c;

function rebuild(prev, s, g){
  if (prev[K(g[0],g[1])] === undefined && (s[0]!==g[0]||s[1]!==g[1])) return null;
  const path = []; let cur = K(g[0],g[1]);
  while (cur !== undefined){ path.push([Math.floor(cur/N), cur%N]); cur = prev[cur]; }
  return path.reverse();
}

// 2a. BFS (Breadth-First Search)
function bfs(grid, s, g){
  const prev = {}; prev[K(s[0],s[1])] = undefined;
  const seen = new Set([K(s[0],s[1])]); const q = [s]; const order = [];
  let head = 0;
  while (head < q.length){
    const [r,c] = q[head++]; order.push([r,c]);
    if (r===g[0] && c===g[1]) break;
    for (const [nr,nc] of neighbours(grid,r,c)){
      const k = K(nr,nc);
      if (!seen.has(k)){ seen.add(k); prev[k] = K(r,c); q.push([nr,nc]); }
    }
  }
  return { path: rebuild(prev,s,g), order };
}

// 2b. Dijkstra (Weighted Shortest Path) with MinHeap
class MinHeap {
  constructor(){ this.a = []; }
  push(x){ const a=this.a; a.push(x); let i=a.length-1;
    while(i>0){ const p=(i-1)>>1; if(a[p][0]<=a[i][0]) break; [a[p],a[i]]=[a[i],a[p]]; i=p; } }
  pop(){ const a=this.a; const top=a[0]; const last=a.pop();
    if(a.length){ a[0]=last; let i=0;
      for(;;){ let l=2*i+1, r=l+1, m=i;
        if(l<a.length && a[l][0]<a[m][0]) m=l;
        if(r<a.length && a[r][0]<a[m][0]) m=r;
        if(m===i) break; [a[m],a[i]]=[a[i],a[m]]; i=m; } }
    return top; }
  get size(){ return this.a.length; }
}

function dijkstra(grid, s, g){
  const dist = {}; const prev = {}; const done = new Set(); const order = [];
  dist[K(s[0],s[1])] = 0; prev[K(s[0],s[1])] = undefined;
  const h = new MinHeap(); h.push([0, s[0], s[1]]);
  while (h.size){
    const [d,r,c] = h.pop(); const k = K(r,c);
    if (done.has(k)) continue;
    done.add(k); order.push([r,c]);
    if (r===g[0] && c===g[1]) break;
    for (const [nr,nc] of neighbours(grid,r,c)){
      const nk = K(nr,nc), nd = d + grid[nr][nc].w;
      if (dist[nk] === undefined || nd < dist[nk]){ dist[nk]=nd; prev[nk]=k; h.push([nd,nr,nc]); }
    }
  }
  const path = rebuild(prev,s,g);
  return { path, order, cost: path ? dist[K(g[0],g[1])] : Infinity };
}

const pathCost = (grid,p) => p.slice(1).reduce((t,[r,c]) => t + grid[r][c].w, 0);
const pathExposure = (grid,p) => p.slice(1).reduce((t,[r,c]) => t + grid[r][c].w - 1, 0);
const riskLabel = e => e <= 12 ? "LOW" : e <= 24 ? "MEDIUM" : "HIGH";

// 2c. Greedy Resource Allocation
function greedyAllocate(sectors, total){
  const ranked = [...sectors].sort((a,b) => (b.threat/b.cost) - (a.threat/a.cost));
  let left = total; const alloc = {}; sectors.forEach(s => alloc[s.id]=0);
  const trace = [];
  for (const s of ranked){
    const give = Math.min(s.cost, left);
    alloc[s.id] = give; left -= give;
    trace.push({ id:s.id, ratio:s.threat/s.cost, give });
  }
  return { alloc, trace, reduced: threatReduced(sectors, alloc) };
}

const coverageOf = (s, alloc) => Math.min(1, (alloc[s.id]||0) / s.cost);
function threatReduced(sectors, alloc){ return sectors.reduce((t,s) => t + s.threat * coverageOf(s, alloc), 0); }
const totalThreat = sectors => sectors.reduce((t,s) => t + s.threat, 0);

function weightedScore(eff, risk, res, coord){
  return WEIGHTS.efficiency*eff + WEIGHTS.risk*risk + WEIGHTS.resources*res + WEIGHTS.coordination*coord;
}

function decisionScore(grid, path, alloc, optimalCost){
  const cost = pathCost(grid,path), expo = pathExposure(grid,path);
  const eff = Math.min(100, 100 * optimalCost / cost);
  const risk = Math.max(0, 100 * (1 - expo / EXPO_REF));
  const res = 100 * threatReduced(SECTORS, alloc) / totalThreat(SECTORS);
  const bySec = Object.fromEntries(SECTORS.map(s => [s.id, coverageOf(s, alloc)]));
  const steps = path.slice(1);
  const coord = steps.length ? 100 * steps.reduce((t,[r,c]) => t + bySec[sectorOf(r,c)], 0) / steps.length : 0;
  return { eff, risk, res, coord, total: weightedScore(eff,risk,res,coord), cost, expo, steps: steps.length };
}

/* ===== 3. UI STATE & RENDER LOGIC ===== */
const grid = buildGrid();
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const optimal = dijkstra(grid, START, GOAL);
const bfsBench = bfs(grid, START, GOAL);
const greedyBench = greedyAllocate(SECTORS, RESOURCES);
const ALGO = {
  bfs:  { label:"BFS", complexity:"O(V + E)" },
  dij:  { label:"Dijkstra", complexity:"O((V + E) log V)" }
};

let player = [START.slice()];
let pAlloc = Object.fromEntries(SECTORS.map(s => [s.id, 0]));
let bfsRes = null, dijRes = null, last = null, greedyShown = false, riskMode = false;
let anim = { cells: [], upto: 0, color: "" };

const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
ctx.scale(2, 2);
const CS = 40;
const isGoal = p => p[0]===GOAL[0] && p[1]===GOAL[1];
const complete = () => isGoal(player[player.length-1]);

function extendPath(gr, path, cell){
  const [r,c] = cell;
  if (r<0||r>=N||c<0||c>=N || gr[r][c].wall) return null;
  const lastCell = path[path.length-1];
  const idx = path.findIndex(p => p[0]===r && p[1]===c);
  if (idx >= 0) return path.slice(0, idx+1);
  if (isGoal(lastCell)) return null;
  if (Math.abs(r-lastCell[0]) + Math.abs(c-lastCell[1]) !== 1) return null;
  return [...path, [r,c]];
}

// Canvas Drawing based on Dark Theme
function line(path, color, w){
  if (!path || path.length < 2) return;
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  path.forEach(([r,c],i) => { const x=c*CS+CS/2, y=r*CS+CS/2; i? ctx.lineTo(x,y) : ctx.moveTo(x,y); });
  ctx.stroke();
}

function draw(){
  ctx.clearRect(0,0,520,520);
  for (let r=0;r<N;r++) for (let c=0;c<N;c++){
    const cell = grid[r][c], x=c*CS, y=r*CS;
    if (cell.wall){
      ctx.fillStyle="#050608"; ctx.fillRect(x,y,CS,CS);
      ctx.fillStyle="#0a0c10"; ctx.fillRect(x+4,y+4,CS-8,CS-8); // Dark walls
    } else {
      // Cell colors based on theme vars
      ctx.fillStyle = cell.w===1 ? "#161b22" : cell.w===3 ? "#2d2417" : "#3a171e";
      ctx.fillRect(x,y,CS,CS);
      ctx.strokeStyle="#1a1d24"; ctx.lineWidth=1; ctx.strokeRect(x+.5,y+.5,CS-1,CS-1);
      
      if (riskMode){
        ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.font="12px Inter, sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        if (cell.w>1) ctx.fillText(cell.w, x+CS/2, y+CS/2);
        ctx.fillStyle="rgba(212,175,55,0.8)"; ctx.font="9px Inter, sans-serif"; ctx.textAlign="left"; ctx.textBaseline="top";
        ctx.fillText(sectorOf(r,c), x+3, y+2);
      }
    }
  }
  for (let i=0;i<anim.upto && i<anim.cells.length;i++){
    const [r,c]=anim.cells[i]; ctx.fillStyle=anim.color; ctx.fillRect(c*CS+8,r*CS+8,CS-16,CS-16);
  }
  if (bfsRes && bfsRes.shown) line(bfsRes.path, "#3fc4ae", 6);
  if (dijRes && dijRes.shown) line(dijRes.path, "#e9e4d4", 4);
  line(player, "#D4AF37", 8);
  
  const mark = (p, t, col) => {
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(p[1]*CS+CS/2, p[0]*CS+CS/2, 13, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle="#0d0f12"; ctx.font="bold 15px Inter, sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(t, p[1]*CS+CS/2, p[0]*CS+CS/2+1);
  };
  mark(START,"S","#D4AF37"); mark(GOAL,"G","#3fc4ae");
  const e = player[player.length-1];
  if (!isGoal(e) && !(e[0]===START[0]&&e[1]===START[1])){ 
      ctx.strokeStyle="#fff"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(e[1]*CS+CS/2,e[0]*CS+CS/2,11,0,Math.PI*2); ctx.stroke(); 
  }
}

function runAlgo(kind){
  const res = kind==="bfs" ? bfs(grid,START,GOAL) : dijkstra(grid,START,GOAL);
  res.shown = false; res.kind = kind;
  if (kind==="bfs") bfsRes = res; else dijRes = res;
  last = res;
  anim = { cells: res.order, upto: 0, color: kind==="bfs" ? "rgba(63,196,174,0.3)" : "rgba(233,228,212,0.3)" };
  const stepSize = Math.max(1, Math.ceil(res.order.length/60));
  const tick = () => {
    if (REDUCED){ anim.upto = res.order.length; } else { anim.upto += stepSize; }
    if (anim.upto >= res.order.length){ anim.upto = res.order.length; res.shown = true; draw(); renderAll(); return; }
    draw(); requestAnimationFrame(tick);
  };
  tick();
}

/* ===== 4. DOM UPDATERS ===== */
const fmt = (n, d=1) => Number(n).toFixed(d);
function playerStats(){
  const cost = pathCost(grid,player), expo = pathExposure(grid,player);
  return { steps: player.length-1, cost, expo };
}
function used(){ return Object.values(pAlloc).reduce((a,b)=>a+b,0); }

function renderLive(){
  const p = playerStats();
  let algoHtml = `<p class="note">Run BFS or Dijkstra to see live trace metrics.</p>`;
  if (last && last.path){
    const c = pathCost(grid,last.path), e = pathExposure(grid,last.path);
    algoHtml = `<h4 style="margin:0 0 .5rem; color: var(--teal);">${ALGO[last.kind].label} Trace Result</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div><span class="note">Nodes explored</span><br><b>${last.order.length}</b></div>
        <div><span class="note">Path length</span><br><b>${last.path.length-1}</b></div>
        <div><span class="note">Path cost</span><br><b>${c}</b></div>
        <div><span class="note">Risk exposure</span><br><b>${e} (${riskLabel(e)})</b></div>
      </div>`;
  }
  document.getElementById("live").innerHTML = `
    <div class="two" style="gap:2rem">
      <div><h4 style="margin:0 0 .5rem; color: var(--brass);">Your Route ${complete() ? '<span class="tag">Complete</span>' : ''}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div><span class="note">Steps</span><br><b>${p.steps}</b></div>
          <div><span class="note">Path cost</span><br><b>${p.cost}</b></div>
          <div><span class="note">Risk exposure</span><br><b>${p.expo} (${riskLabel(p.expo)})</b></div>
          <div><span class="note">Resources used</span><br><b>${used()} / ${RESOURCES}</b></div>
        </div></div>
      <div>${algoHtml}</div>
    </div>`;
}

function renderAlloc(){
  const g = greedyShown ? greedyBench.alloc : null;
  let h = `<tr><th>Sector</th><th>Threat</th><th>Needs</th><th>Yours</th>${g?'<th>Greedy</th>':''}</tr>`;
  for (const s of SECTORS){
    h += `<tr><td>${s.id} <span class="note">${s.name}</span></td><td>${s.threat}</td><td>${s.cost}</td>
      <td><span class="step"><button data-s="${s.id}" data-d="-1">−</button><b>${pAlloc[s.id]}</b><button data-s="${s.id}" data-d="1">+</button></span>
      <div class="blocks">${"█".repeat(pAlloc[s.id])}</div></td>
      ${g?`<td><b>${g[s.id]}</b><div class="blocks g">${"█".repeat(g[s.id])}</div></td>`:''}</tr>`;
  }
  const yr = threatReduced(SECTORS, pAlloc);
  h += `<tr><td colspan="${g?3:3}"><b>Threat reduced</b> (max ${totalThreat(SECTORS)})</td><td><b>${fmt(yr)}</b></td>${g?`<td><b class="best">${fmt(greedyBench.reduced)}</b></td>`:''}</tr>`;
  document.getElementById("allocTable").innerHTML = h;
  document.getElementById("resLeft").textContent = RESOURCES - used();
  document.getElementById("greedyOut").innerHTML = greedyShown
    ? `<b>Greedy Engine:</b> Ranks sectors by threat per resource, funding best ratios first.<br> <span class="note">${greedyBench.trace.map(t => `${t.id} (${fmt(t.ratio,2)}/unit)`).join(" → ")}</span>`
    : "";
}

function strategyFor(path, alloc){ return decisionScore(grid, path, alloc, optimal.cost); }

function renderCompare(){
  const el = document.getElementById("cmpBody");
  if (!complete()){
    el.innerHTML = `<p class="lede">Build a route from S to G in the Strategic Lab to compare it with the algorithms.</p><button class="btn" onclick="navigateTo('lab')">Go to Lab</button>`;
    return;
  }
  const you = strategyFor(player, pAlloc), dij = strategyFor(optimal.path, greedyBench.alloc), bf = strategyFor(bfsBench.path, greedyBench.alloc);
  const yr = threatReduced(SECTORS,pAlloc);
  const best = (a,b,lowerBetter) => (lowerBetter ? a<b : a>b) ? "best" : "";
  
  el.innerHTML = `<div class="scroll"><table class="cmp" style="width:100%">
    <tr><th>Metric</th><th>Your Strategy</th><th>Dijkstra + Greedy</th><th>BFS + Greedy</th></tr>
    <tr><td><b>Path cost</b></td><td class="${best(you.cost,dij.cost,true)}">${you.cost}</td><td class="best">${dij.cost}</td><td>${bf.cost}</td></tr>
    <tr><td><b>Risk exposure</b></td><td>${you.expo}</td><td>${dij.expo}</td><td>${bf.expo}</td></tr>
    <tr><td><b>Steps</b></td><td>${you.steps}</td><td>${dij.steps}</td><td>${bf.steps}</td></tr>
    <tr><td><b>Resources used</b></td><td>${used()}</td><td>${RESOURCES}</td><td>${RESOURCES}</td></tr>
    <tr><td><b>Threat reduced</b></td><td>${fmt(yr)}</td><td>${fmt(greedyBench.reduced)}</td><td>${fmt(greedyBench.reduced)}</td></tr>
    <tr><td><b>Decision score</b></td><td><b style="font-size:1.2rem">${fmt(you.total,0)}</b></td><td><b class="best" style="font-size:1.2rem">${fmt(dij.total,0)}</b></td><td><b style="font-size:1.2rem">${fmt(bf.total,0)}</b></td></tr>
  </table></div>
  <div style="margin-top:2rem; padding: 1.5rem; border-left: 3px solid var(--teal); background: var(--bg2);">
    <p style="margin:0">${you.cost > dij.cost
    ? "The algorithm found a lower-cost strategy under the assumptions defined by the simulation."
    : "Your route matched the minimum-cost route under the assumptions defined by the simulation."} Note: BFS finds fewest steps ignoring cost; Dijkstra finds lowest total cost.</p>
  </div>`;
}

function bar(label, v, cls=""){
  return `<div class="bar ${cls}"><span>${label}</span><div class="t"><i style="width:${Math.max(0,Math.min(100,v))}%"></i></div><b>${fmt(v,0)}%</b></div>`;
}

function renderResults(){
  const el = document.getElementById("resBody");
  const bench = strategyFor(optimal.path, greedyBench.alloc);
  if (!complete()){
    el.innerHTML = `<div class="dash"><div class="big"><span>Algorithmic Benchmark</span><b>${fmt(bench.total,0)} / 100</b></div>
      <p class="note">Complete the simulation in the Strategic Lab to see your score.</p></div>`;
    return;
  }
  const you = strategyFor(player, pAlloc);
  const obs = you.cost > optimal.cost
    ? `The weighted shortest-path algorithm reduced calculated route cost from ${you.cost} to ${optimal.cost} (a ${fmt(100*(you.cost-optimal.cost)/you.cost,0)}% reduction based on model assumptions).`
    : `Your route successfully reached the minimum calculated cost of ${optimal.cost}, equaling the Dijkstra benchmark.`;
    
  el.innerHTML = `<div class="dash">
    <div class="big"><span>Your Final Score</span><b>${fmt(you.total,0)} / 100</b></div>
    ${bar("Efficiency",you.eff)}${bar("Risk management",you.risk)}${bar("Resource usage",you.res)}${bar("Coordination",you.coord)}
    
    <div class="big" style="margin-top:3rem"><span>Algorithmic Benchmark</span><b style="color:var(--teal)">${fmt(bench.total,0)} / 100</b></div>
    ${bar("Efficiency",bench.eff,"bench")}${bar("Risk management",bench.risk,"bench")}${bar("Resource usage",bench.res,"bench")}${bar("Coordination",bench.coord,"bench")}
    
    <div style="margin-top:2rem; padding:1.5rem; background:var(--bg); border: 1px solid var(--line); border-radius: 4px;">
      <h3 style="color:var(--teal); margin-bottom: 0.5rem;">Key Observation</h3>
      <p style="margin:0">${obs}</p>
    </div>
  </div>`;
}

function renderAlgoCards(){
  const cards = [
    { id:"bfs", name:"BFS", purpose:"Shortest path (equal cost moves)", cx:"O(V + E)",
      input:"Grid graph, start S, goal G.",
      steps:["Put S in a queue, mark visited.","Process front cell; add unvisited neighbours to back.","Stop at G.","Trace links back."],
      output:"Path with fewest steps.", cx2:"Linear relative to vertices + edges." },
    { id:"dij", name:"Dijkstra", purpose:"Minimum weighted cost", cx:"O((V+E) log V)",
      input:"Graph with cell entry costs.",
      steps:["Set S cost 0, queue it.","Take cheapest unsettled cell.","Update neighbours if cheaper route found.","Stop at G."],
      output:"Path with lowest total cost.", cx2:"Priority queue adds log V overhead." },
    { id:"gr", name:"Greedy Allocation", purpose:"Prioritise limited resources", cx:"O(n log n)",
      input:"Sectors with threat/cost levels; resource cap.",
      steps:["Compute threat ÷ resources needed.","Sort highest ratio to lowest.","Fund in order until depleted."],
      output:"Optimized threat reduction.", cx2:"Sorting dominates execution time." }
  ];
  document.getElementById("algoCards").innerHTML = cards.map(c => `
    <div class="panel card-hover" style="margin-bottom:0"><h3>${c.name}</h3>
      <p class="note" style="margin-bottom:1rem"><b>Purpose:</b> ${c.purpose}<br><b>Complexity:</b> ${c.cx}</p>
      <div style="border-top: 1px solid var(--line); padding-top: 1rem;">
        <h4 style="font-size:1rem; margin-bottom:0.2rem">Steps</h4>
        <ol class="note" style="padding-left:1.2rem; margin-bottom: 1rem;">${c.steps.map(s=>`<li>${s}</li>`).join("")}</ol>
      </div></div>`).join("");
}

function renderAll(){ renderLive(); renderAlloc(); renderCompare(); renderResults(); }

/* ===== 5. EVENT LISTENERS ===== */
cv.addEventListener("click", e => {
  const rc = cv.getBoundingClientRect();
  const c = Math.floor((e.clientX-rc.left)/rc.width*N), r = Math.floor((e.clientY-rc.top)/rc.height*N);
  const np = extendPath(grid, player, [r,c]);
  if (np){ player = np; draw(); renderAll(); }
});
document.getElementById("runBfs").onclick = () => runAlgo("bfs");
document.getElementById("runDij").onclick = () => runAlgo("dij");
document.getElementById("undo").onclick = () => { if (player.length>1){ player = player.slice(0,-1); draw(); renderAll(); } };
document.getElementById("reset").onclick = () => {
  player=[START.slice()]; pAlloc=Object.fromEntries(SECTORS.map(s=>[s.id,0]));
  bfsRes=dijRes=last=null; greedyShown=false; anim={cells:[],upto:0,color:""}; draw(); renderAll();
};
document.getElementById("fromBfs").onclick = () => { player = bfsBench.path.map(p=>p.slice()); draw(); renderAll(); };
document.getElementById("riskMode").onchange = e => { riskMode = e.target.checked; draw(); };
document.getElementById("runGreedy").onclick = () => { greedyShown = true; renderAlloc(); renderCompare(); };
document.getElementById("clearAlloc").onclick = () => { pAlloc = Object.fromEntries(SECTORS.map(s=>[s.id,0])); renderAll(); };
document.getElementById("allocTable").addEventListener("click", e => {
  const b = e.target.closest("button[data-s]"); if (!b) return;
  const s = SECTORS.find(x => x.id===b.dataset.s), d = +b.dataset.d;
  const nv = pAlloc[s.id] + d;
  if (nv < 0 || nv > s.cost || used() + d > RESOURCES) return;
  pAlloc[s.id] = nv; renderAll();
});

/* ===== 6. TESTING SUITE & LOCAL STORAGE LOGS ===== */
function bellman(gr, weighted){
  const dist = Array(N*N).fill(Infinity); dist[K(START[0],START[1])] = 0;
  for (let it=0; it<N*N; it++){
    let ch = false;
    for (let r=0;r<N;r++) for (let c=0;c<N;c++){
      if (gr[r][c].wall || dist[K(r,c)]===Infinity) continue;
      for (const [nr,nc] of neighbours(gr,r,c)){
        const nd = dist[K(r,c)] + (weighted ? gr[nr][nc].w : 1);
        if (nd < dist[K(nr,nc)]){ dist[K(nr,nc)] = nd; ch = true; }
      }
    }
    if (!ch) break;
  }
  return dist[K(GOAL[0],GOAL[1])];
}
const validPath = (gr,p) => p && p[0].join()===START.join() && isGoal(p[p.length-1]) &&
  p.every(([r,c],i) => !gr[r][c].wall && (i===0 || Math.abs(r-p[i-1][0])+Math.abs(c-p[i-1][1])===1));

function runTests(){
  const T = [];
  const add = (name, expected, actual, ok) => T.push({ name, expected, actual, ok });
  const g0 = buildGrid();
  
  const b = bfs(g0,START,GOAL), refSteps = bellman(g0,false);
  add("BFS shortest path", `Valid, ${refSteps} steps`, `${b.path.length-1} steps`, validPath(g0,b.path) && b.path.length-1===refSteps);
  
  const d = dijkstra(g0,START,GOAL), refCost = bellman(g0,true);
  add("Dijkstra min cost", `Valid, cost ${refCost}`, `cost ${pathCost(g0,d.path)}`, validPath(g0,d.path) && pathCost(g0,d.path)===refCost);
  
  const gr = greedyAllocate(SECTORS, RESOURCES);
  add("Resource alloc", `≤ ${RESOURCES} units`, `${Object.values(gr.alloc).reduce((x,y)=>x+y,0)} units`, Object.values(gr.alloc).reduce((x,y)=>x+y,0)<=RESOURCES);
  
  document.getElementById("testTable").innerHTML = "<tr><th>Test Protocol</th><th>Expected</th><th>Actual</th><th>Status</th></tr>" +
    T.map(t => `<tr><td>${t.name}</td><td>${t.expected}</td><td>${t.actual}</td><td style="color:${t.ok?'var(--teal)':'var(--red)'}; font-weight:bold;">${t.ok?"PASS":"FAIL"}</td></tr>`).join("");
  document.getElementById("testSummary").textContent = `${T.filter(t=>t.ok).length} of ${T.length} checks passed`;
}
document.getElementById("runTests").onclick = runTests;

// Manual Tester Logs (Synced with Java Backend & Supabase)
const MANUAL = ["Can users start simulation?", "Can users route path?", "BFS successful?", "Dijkstra successful?", "Score computes dynamically?"];
let savedManual = {}; 

// Fetch saved logs from the backend when the page loads
async function fetchLogs() {
    try {
        const response = await fetch('http://localhost:8080/api/logs');
        if (response.ok) {
            const data = await response.json();
            data.forEach(log => {
                savedManual[log.testId] = {
                    who: log.testerName || "",
                    what: log.observation || "",
                    st: log.status || "Pending"
                };
            });
            renderManual();
        }
    } catch (e) {
        console.log("Backend offline, using local state.", e);
    }
}

function renderManual(){
  document.getElementById("manualTable").innerHTML = "<tr><th>Test</th><th>Tester Name</th><th>Observation</th><th>Status</th></tr>" +
    MANUAL.map((m,i) => `<tr><td>${m}</td>
      <td><input class="cell" data-i="${i}" data-f="who" placeholder="Name" value="${(savedManual[i]&&savedManual[i].who)||""}"></td>
      <td><input class="cell" data-i="${i}" data-f="what" placeholder="Notes" value="${(savedManual[i]&&savedManual[i].what)||""}"></td>
      <td><select class="cell" data-i="${i}" data-f="st">
        ${["Pending","Pass","Fail"].map(o=>`<option${(savedManual[i]&&savedManual[i].st)===o?" selected":""}>${o}</option>`).join("")}
      </select></td></tr>`).join("");
}

// Change "input" to "change" so it saves when you click away or select an option
document.getElementById("manualTable").addEventListener("change", async e => {
  const t = e.target; 
  if (!t.dataset.i) return;
  
  const index = t.dataset.i;
  savedManual[index] = savedManual[index] || {}; 
  savedManual[index][t.dataset.f] = t.value;

  const logPayload = {
      testId: index.toString(),
      testerName: savedManual[index].who || "",
      observation: savedManual[index].what || "",
      status: savedManual[index].st || "Pending"
  };

  try {
      await fetch('http://localhost:8080/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logPayload)
      });
      console.log("Log saved cleanly on change!");
  } catch (err) {
      console.error("Failed to sync log with backend:", err);
  }
});

// Team Members Persistence Logic
document.addEventListener("DOMContentLoaded", () => {
    let savedTeam = {};
    try {
        savedTeam = JSON.parse(localStorage.getItem("mlab-team-members")) || {};
    } catch(e) {}

    // Populate inputs from storage
    document.querySelectorAll(".team-card").forEach(card => {
        const id = card.dataset.id;
        if (savedTeam[id]) {
            card.querySelector("[data-field='name']").value = savedTeam[id].name || "";
            card.querySelector("[data-field='roll']").value = savedTeam[id].roll || "";
        }
    });

    // Save on input change
    document.getElementById("teamContainer").addEventListener("input", e => {
        const target = e.target;
        if (!target.classList.contains("team-input")) return;
        
        const card = target.closest(".team-card");
        const id = card.dataset.id;
        
        savedTeam[id] = savedTeam[id] || {};
        savedTeam[id].name = card.querySelector("[data-field='name']").value;
        savedTeam[id].roll = card.querySelector("[data-field='roll']").value;

        try {
            localStorage.setItem("mlab-team-members", JSON.stringify(savedTeam));
        } catch(err) {
            console.error("Failed to save team details", err);
        }
    });
});

// INITIALIZATION
document.getElementById("exScore").textContent = fmt(weightedScore(82,76,90,70)) + " / 100";
renderAlgoCards(); fetchLogs(); runTests(); draw(); renderAll();