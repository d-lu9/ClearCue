const defaults = [
  { id: 'pred', name: 'Prednisolone Acetate', eye: 'Right eye', color: '#ef8c3e', time: '08:00', done: false },
  { id: 'moxi', name: 'Moxifloxacin', eye: 'Right eye', color: '#38a7de', time: '08:05', done: false },
  { id: 'tear', name: 'Artificial Tears', eye: 'Both eyes', color: '#8f76c8', time: '13:00', done: false }
];
let doses = JSON.parse(localStorage.getItem('dropwise-doses') || 'null') || defaults;
const list = document.querySelector('#scheduleList'); const toast = document.querySelector('#toast');
function displayTime(time) { const [h,m] = time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`; }
function save() { localStorage.setItem('dropwise-doses', JSON.stringify(doses)); }
function render() { doses.sort((a,b)=>a.time.localeCompare(b.time)); list.innerHTML = doses.length ? doses.map(d => `<article class="dose-card ${d.done ? 'completed' : ''}"><span class="color-dot" style="background:${d.color}"></span><div><h3>${d.name}</h3><p>${d.eye} · Cap color</p></div><div><time>${displayTime(d.time)}</time><button class="complete-button" data-id="${d.id}" aria-label="${d.done ? 'Mark incomplete' : 'Mark taken'}">${d.done ? '✓' : 'Done'}</button></div></article>`).join('') : '<p class="empty">No drops scheduled yet. Add your first one below.</p>';
  const complete = doses.filter(d=>d.done).length, total = doses.length, percent = total ? Math.round(complete / total * 100) : 0;
  document.querySelector('#progressText').textContent = `${complete} of ${total} completed`; document.querySelector('#progressPercent').textContent = `${percent}%`; const ring=document.querySelector('#progressRing'); ring.style.setProperty('--progress', `${percent * 3.6}deg`); ring.setAttribute('aria-label', `${percent} percent complete`); save();
}
function message(text) { toast.textContent=text; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 2300); }
list.addEventListener('click', e => { const button=e.target.closest('[data-id]'); if (!button) return; const dose=doses.find(d=>d.id===button.dataset.id); dose.done=!dose.done; render(); message(dose.done ? `${dose.name} marked complete.` : `${dose.name} reopened.`); });
const medicationDialog=document.querySelector('#medicationDialog'); document.querySelector('#addMedication').onclick=()=>medicationDialog.showModal();
document.querySelector('#medicationForm').addEventListener('submit', e=>{ e.preventDefault(); const frequency=+document.querySelector('#medFrequency').value; const [hour,minute]=document.querySelector('#medTime').value.split(':').map(Number); for(let i=0;i<frequency;i++){ const total=(hour*60+minute+i*Math.floor(720/frequency))%(24*60); doses.push({id:crypto.randomUUID(), name:document.querySelector('#medName').value, eye:document.querySelector('#medEye').value, color:document.querySelector('#medColor').value, time:`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`, done:false}); } medicationDialog.close(); e.target.reset(); render(); message(`${frequency} reminder${frequency>1?'s':''} added to your routine.`); });
const help=document.querySelector('#helpDialog'); document.querySelector('#helpButton').onclick=()=>help.showModal(); document.querySelector('#closeHelp').onclick=()=>help.close(); document.querySelector('#closeHelpButton').onclick=()=>help.close(); document.querySelector('#viewHistory').onclick=()=>message('History will be the next feature we build.'); render();
