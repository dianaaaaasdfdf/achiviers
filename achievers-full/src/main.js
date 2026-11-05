import * as db from './db.js'
import { S, loadMe, setView } from './state.js'
import { $, esc, act, actions, setRender, render, go, toast, status, spin } from './ui.js'
import { onboard, bindOnboard, discover, drawFingerprint, profilePage, activities } from './candidate.js'
import { marketplace, topicPage, learning, coursePage, feedbackPage, PROMPTS } from './develop.js'
import { applyPage, jobPage, challengePage, groupPage, leaveChallenge } from './apply.js'
import { discoverPage, jobsPage, assessPage, jobPipeline, comparePage, candidatePage, topicsAdmin, companyPage } from './employer.js'

const STAGES = [['Register / Discover', '#discover', 'candidate'], ['Develop & Express', '#develop', 'candidate'], ['Demonstrate', '#apply', 'candidate'], ['Connect', '#e-discover', 'employer']]
const CAND_NAV = [['#discover', 'Discover'], ['#develop', 'Develop'], ['#apply', 'Apply'], ['#activities', 'My Activities'], ['#profile', 'My Profile']]
const EMP_NAV = [['#e-discover', 'Talent Discovery'], ['#e-jobs', 'Job Openings'], ['#e-assess', 'Assessments'], ['#e-company', 'Company']]

function stageOf(h) {
  if (h.startsWith('e-')) return 3
  if (/^(apply|job|challenge|group)/.test(h)) return 2
  if (/^(develop|topic|course)/.test(h)) return 1
  return 0
}

async function route() {
  const raw = location.hash.slice(1)
  const [path, query] = raw.split('?'), params = new URLSearchParams(query || '')
  const view = $('#view')
  if (!path.startsWith('challenge/') && !path.startsWith('group/')) leaveChallenge()
  if (path.startsWith('ref/')) return refereeView(path.slice(4))
  if (!S.started) return welcome()
  const wantEmp = path.startsWith('e-')
  // topic pages are shared by both views
  if (path && !path.startsWith('topic/') && wantEmp !== (S.view === 'employer')) await switchView(wantEmp ? 'employer' : 'candidate', false)
  shell(path)
  if (!path) return go(S.view === 'employer' ? '#e-discover' : (S.profile.onboarding || 0) >= 4 ? '#discover' : '#onboard')
  view.innerHTML = `<p class="status">${spin}Loading…</p>`
  try {
    const [a, b] = path.split('/')
    let html
    switch (a) {
      case 'onboard': html = onboard(); break
      case 'discover': html = discover(); break
      case 'develop': html = b === 'learn' ? learning() : b === 'feedback' ? feedbackPage(params) : await marketplace(); break
      case 'topic': html = await topicPage(decodeURIComponent(b)); break
      case 'course': html = coursePage(b); break
      case 'apply': html = await applyPage(); break
      case 'job': html = await jobPage(decodeURIComponent(b)); break
      case 'challenge': html = await challengePage(b); break
      case 'group': html = await groupPage(b); break
      case 'activities': html = await activities(); break
      case 'profile': html = profilePage(); break
      case 'e-discover': html = await discoverPage(); break
      case 'e-jobs': html = await jobsPage(); break
      case 'e-assess': html = await assessPage(); break
      case 'e-job': html = await jobPipeline(decodeURIComponent(b)); break
      case 'e-compare': html = await comparePage(decodeURIComponent(b), (params.get('ids') || '').split(',').filter(Boolean)); break
      case 'e-cand': html = await candidatePage(decodeURIComponent(b), params); break
      case 'e-topics': html = await topicsAdmin(); break
      case 'e-company': html = companyPage(); break
      default: html = `<div class="card"><h2>Page not found</h2><a href="#discover">Go to my fingerprint</a></div>`
    }
    view.innerHTML = html
    if (a === 'onboard') bindOnboard()
    if (a === 'discover') drawFingerprint()
    if (a === 'group') { const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight; actions['g-alloc']?.() }
  } catch (e) {
    console.error(e)
    view.innerHTML = `<div class="card stack"><h2>Something went wrong</h2><p class="hint">${esc(e.message || e)}</p><p class="hint">If this mentions a missing column or table, run supabase/schema_v2.sql in Supabase.</p></div>`
  }
}
setRender(() => { const y = window.scrollY; route().then(() => window.scrollTo(0, y)) })
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0) })

function shell(path) {
  const emp = S.view === 'employer', items = emp ? EMP_NAV : CAND_NAV
  const st = stageOf(path)
  $('#nav').hidden = false
  $('#nav').innerHTML = items.map(([h, n]) => `<a href="${h}" ${('#' + path).startsWith(h) || (h === '#discover' && path === 'onboard') ? 'aria-current="page"' : ''}>${n}</a>`).join('')
  $('#who').innerHTML = `<div class="switch" role="group" aria-label="View"><button data-act="view" data-v="candidate" aria-pressed="${!emp}">Candidate</button><button data-act="view" data-v="employer" aria-pressed="${emp}">Employer</button></div>
    ${db.currentMode() === 'cloud' ? '<button class="ghost" data-act="signout">Sign out</button>' : `<span class="pill">Guest</span>${db.cloudAvailable ? '<button class="ghost" data-act="signout">Exit</button>' : ''}`}`
  $('#stages').hidden = false
  $('#stages').innerHTML = `<div class="wrap">${STAGES.map(([n, h], i) => `<a href="${h}" class="${i === st ? 'on' : ''}"><b>${i + 1}</b>${n}</a>`).join('')}</div>`
}
async function switchView(v, navigate = true) {
  setView(v)
  await loadMe()
  if (v === 'employer' && !S.profile.is_recruiter) { await db.saveProfile({ is_recruiter: true }); S.profile.is_recruiter = true }
  if (navigate) { toast(v === 'employer' ? 'Employer view' : 'Candidate view'); go(v === 'employer' ? '#e-discover' : '#discover') }
}
act('view', el => switchView(el.dataset.v))

// ---------- welcome / sign in ----------
function welcome() {
  $('#nav').hidden = true; $('#stages').hidden = true; $('#who').innerHTML = ''
  $('#view').innerHTML = `<section class="hero">
    <div><span class="logo-full" role="img" aria-label="Achievers"></span>
      <h1>Beyond what candidates say they can do.</h1>
      <p class="lede">A Skill Fingerprint that grows with you: your CV and projects, short assessments, lessons, contributions and job simulations, each labelled by where the evidence came from. Employers see anonymised evidence, not just a CV.</p>
      <ol class="stagelist">${STAGES.map(([n]) => `<li>${n}</li>`).join('')}</ol>
    </div>
    <div class="card stack">
      ${db.cloudAvailable ? `<h2>Sign in or create an account</h2>
      <div><label for="email">Email</label><input type="email" id="email" autocomplete="email"></div>
      <div><label for="pw">Password <span class="opt">(8+ characters)</span></label><input type="password" id="pw" autocomplete="current-password"></div>
      <div class="row"><button class="primary" data-act="signup">Create account</button><button data-act="signin">Log in</button></div>
      <p class="status" id="authst"></p><hr>` : '<h2>Try it</h2><p class="hint">Accounts are not configured on this deployment, so data stays in this browser.</p>'}
      <button data-act="guest">Try without an account</button>
      <p class="hint">Without an account, data stays in this browser and referee links cannot be shared.</p>
    </div></section>`
}
async function enter() { S.started = true; await loadMe(); route() }
act('guest', async () => { db.useGuest(); await enter() })
for (const kind of ['signup', 'signin']) act(kind, async el => {
  const email = $('#email').value.trim(), pw = $('#pw').value
  if (!email || pw.length < 8) return status('#authst', 'Enter your email and a password of at least 8 characters.', true)
  el.disabled = true; status('#authst', spin + (kind === 'signup' ? 'Creating account…' : 'Logging in…'))
  try {
    if (kind === 'signup') { const r = await db.signUp(email, pw); if (!r.session) return status('#authst', 'Check your inbox to confirm your email, then log in.') }
    else await db.signIn(email, pw)
    await enter()
  } catch (e) { status('#authst', esc(e.message), true) } finally { el.disabled = false }
})
act('signout', async () => { await db.signOut(); S.started = false; location.hash = ''; route() })
act('copy', async el => { try { await navigator.clipboard.writeText(el.dataset.v); el.textContent = 'Copied' } catch { el.previousElementSibling?.select() } })

// ---------- referee page (no account) ----------
async function refereeView(token) {
  $('#nav').hidden = true; $('#stages').hidden = true; $('#who').innerHTML = ''
  const v = $('#view')
  if (!db.sb) { v.innerHTML = `<div class="card"><h2>This link needs the online version</h2></div>`; return }
  v.innerHTML = `<p class="status">${spin}Loading…</p>`
  let r; try { r = await db.getRef(token) } catch { r = null }
  if (!r) { v.innerHTML = `<div class="card"><h2>This link is not valid</h2><p class="hint">Ask the person who sent it for a new one.</p></div>`; return }
  const who = esc(r.student_first_name || 'this student')
  if (r.status === 'answered') { v.innerHTML = `<div class="card"><h2>Thank you</h2><p class="lede">Your feedback about ${who} has been recorded.</p></div>`; return }
  v.innerHTML = `<div class="grid g2"><section class="card stack">
     <div class="eyebrow">Meet me through others</div>
     <h1>${who} asked for your feedback</h1>
     <p class="lede">Hi ${esc(r.referee_name)}. ${who} listed you as a ${esc(r.relationship.toLowerCase())}${r.experience_title ? ` on <b>${esc(r.experience_title)}</b>` : ''}, and asked about their <b>${esc(r.skill_label.toLowerCase())}</b>. Please answer with specific observations.</p>
     ${PROMPTS.map((p, i) => `<div><label for="rq${i}">${p}</label><textarea id="rq${i}" rows="3"></textarea></div>`).join('')}
     <label class="toggle"><input type="checkbox" id="rconsent"><span>I agree that my first name, relationship and answer are shown in ${who}'s Skill Fingerprint.</span></label>
     <div class="row"><button class="primary" data-act="refsubmit" data-token="${esc(token)}">Send feedback</button></div><p class="status" id="refst"></p>
   </section>
   <section class="card stack"><h3>How your answer is used</h3><p class="hint">It is labelled as contextual feedback and linked to the experience above. Employers see it next to the rest of ${who}'s evidence. You can only answer once.</p></section></div>`
}
act('refsubmit', async el => {
  const parts = PROMPTS.map((p, i) => [p, $('#rq' + i).value.trim()]).filter(([, a]) => a)
  const text = parts.map(([p, a]) => `${p} ${a}`).join(' ')
  if (text.length < 40) return status('#refst', 'Please answer at least one question with a real example.', true)
  if (!$('#rconsent').checked) return status('#refst', 'Please confirm consent to share your answer.', true)
  el.disabled = true
  try { const ok = await db.submitRef(el.dataset.token, text); if (!ok) return status('#refst', 'This request was already answered.', true); $('#view').innerHTML = `<div class="card"><h2>Thank you</h2><p class="lede">Your feedback has been recorded.</p></div>` }
  catch (e) { status('#refst', esc(e.message), true); el.disabled = false }
})

// ---------- events ----------
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (!t || !actions[t.dataset.act]) return
  if (t.tagName === 'A') e.preventDefault()
  try { await actions[t.dataset.act](t, e) } catch (err) { console.error(err); toast(err.message || String(err), true) }
})
document.addEventListener('change', async e => {
  const t = e.target.closest('[data-change]'); if (!t || !actions[t.dataset.change]) return
  try { await actions[t.dataset.change](t, e) } catch (err) { console.error(err); toast(err.message || String(err), true) }
})
document.addEventListener('input', e => { if (e.target.closest('[data-change="g-alloc"]')) actions['g-alloc']?.() })

// ---------- boot ----------
;(async () => {
  const session = await db.initAuth().catch(() => null)
  if (session) { S.started = true; await loadMe().catch(e => toast(e.message, true)) }
  route()
})()
