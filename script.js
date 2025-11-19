// Smart Productivity Suite - Complete Multi-Module System
// ============================================================

// Storage keys
const KEYS = {
  tasks: 'suite_tasks_v1',
  pomodoros: 'suite_pomodoros_v1',
  habits: 'suite_habits_v1',
  notes: 'suite_notes_v1',
  timetable: 'suite_timetable_v1',
  theme: 'suite_theme_v1'
};

// Utility functions
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const save = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const load = key => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
};

// ============================================================
// DARK MODE
// ============================================================
const themeToggle = qs('#theme-toggle');
let darkMode = localStorage.getItem(KEYS.theme) === 'dark';

function applyTheme(){
  if(darkMode){
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
  }
}

themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  localStorage.setItem(KEYS.theme, darkMode ? 'dark' : 'light');
  applyTheme();
  // Redraw charts with new theme
  if(taskChart) renderCharts();
});

applyTheme();

// ============================================================
// NOTIFICATIONS API
// ============================================================
let notificationsEnabled = false;
const notificationRequest = qs('#notification-request');
const enableNotificationsBtn = qs('#enable-notifications');

function checkNotificationPermission(){
  if(!('Notification' in window)){
    notificationRequest.style.display = 'none';
    return;
  }
  if(Notification.permission === 'granted'){
    notificationsEnabled = true;
    notificationRequest.classList.add('hidden');
  } else if(Notification.permission === 'denied'){
    notificationRequest.innerHTML = '<p>❌ Notifications blocked. Please enable them in browser settings.</p>';
  }
}

enableNotificationsBtn.addEventListener('click', async () => {
  if(!('Notification' in window)){
    alert('This browser does not support notifications.');
    return;
  }
  const permission = await Notification.requestPermission();
  if(permission === 'granted'){
    notificationsEnabled = true;
    notificationRequest.classList.add('hidden');
    new Notification('🎉 Notifications Enabled!', {
      body: 'You will now receive alerts when Pomodoro sessions complete.',
      icon: '🍅'
    });
  }
});

checkNotificationPermission();

function sendNotification(title, body){
  if(notificationsEnabled && Notification.permission === 'granted'){
    new Notification(title, {body, icon: '🍅'});
  }
}

// ============================================================
// NAVIGATION
// ============================================================
const navLinks = qsa('.nav-link');
const views = qsa('.view');

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const viewName = link.dataset.view;
    navLinks.forEach(l => l.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));
    link.classList.add('active');
    qs(`#view-${viewName}`).classList.add('active');
    if(viewName === 'dashboard') renderDashboard();
  });
});

// ============================================================
// TASKS MODULE
// ============================================================
let tasks = load(KEYS.tasks) || [];
let editingTaskId = null;

const taskInput = qs('#task-input');
const taskDue = qs('#task-due');
const taskCategory = qs('#task-category');
const addTaskBtn = qs('#add-task-btn');
const taskList = qs('#task-list');
const filterStatus = qs('#filter-status');
const filterCategory = qs('#filter-category');

function renderTasks(){
  const status = filterStatus.value;
  const category = filterCategory.value;
  const filtered = tasks.filter(t => {
    if(status === 'active' && t.completed) return false;
    if(status === 'completed' && !t.completed) return false;
    if(category !== 'all' && t.category !== category) return false;
    return true;
  });
  taskList.innerHTML = '';
  if(filtered.length === 0){
    taskList.innerHTML = '<p style="color:#64748b">No tasks yet.</p>';
    return;
  }
  filtered.forEach(t => {
    const el = document.createElement('div');
    el.className = 'task' + (t.completed ? ' completed' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = t.completed;
    cb.addEventListener('change', () => {
      t.completed = !t.completed;
      save(KEYS.tasks, tasks);
      renderTasks();
    });
    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = t.text;
    const info = document.createElement('div');
    info.className = 'category';
    info.textContent = t.category;
    if(t.due){
      const dueDate = new Date(t.due);
      info.textContent += ' • Due: ' + dueDate.toLocaleDateString();
    }
    meta.appendChild(title);
    meta.appendChild(info);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEditTask(t.id));
    const delBtn = document.createElement('button');
    delBtn.className = 'delete';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      tasks = tasks.filter(x => x.id !== t.id);
      save(KEYS.tasks, tasks);
      renderTasks();
    });
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    el.appendChild(cb);
    el.appendChild(meta);
    el.appendChild(actions);
    taskList.appendChild(el);
  });
}

function addTask(){
  const text = taskInput.value.trim();
  const category = taskCategory.value;
  const due = taskDue.value;
  if(!text) return;
  tasks.unshift({id:uid(), text, category, due, completed:false, created:Date.now()});
  save(KEYS.tasks, tasks);
  taskInput.value = '';
  taskDue.value = '';
  renderTasks();
}

function startEditTask(id){
  const t = tasks.find(x => x.id === id);
  if(!t) return;
  editingTaskId = id;
  taskInput.value = t.text;
  taskCategory.value = t.category;
  taskDue.value = t.due || '';
  addTaskBtn.textContent = 'Save';
}

function saveEditTask(){
  const text = taskInput.value.trim();
  if(!text || !editingTaskId) return cancelEditTask();
  const t = tasks.find(x => x.id === editingTaskId);
  if(!t) return;
  t.text = text;
  t.category = taskCategory.value;
  t.due = taskDue.value;
  editingTaskId = null;
  addTaskBtn.textContent = 'Add';
  taskInput.value = '';
  taskDue.value = '';
  save(KEYS.tasks, tasks);
  renderTasks();
}

function cancelEditTask(){
  editingTaskId = null;
  addTaskBtn.textContent = 'Add';
  taskInput.value = '';
  taskDue.value = '';
}

addTaskBtn.addEventListener('click', () => {
  if(editingTaskId) saveEditTask(); else addTask();
});
taskInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') {
    if(editingTaskId) saveEditTask(); else addTask();
  }
  if(e.key === 'Escape') cancelEditTask();
});
filterStatus.addEventListener('change', renderTasks);
filterCategory.addEventListener('change', renderTasks);

// ============================================================
// POMODORO MODULE
// ============================================================
let pomodoros = load(KEYS.pomodoros) || {sessions:[], todayCount:0, lastDate:null};

const timerDisplay = qs('#timer-display');
const timerLabel = qs('#timer-label');
const timerStart = qs('#timer-start');
const timerPause = qs('#timer-pause');
const timerReset = qs('#timer-reset');
const focusTimeInput = qs('#focus-time');
const breakTimeInput = qs('#break-time');
const sessionsTodayEl = qs('#sessions-today');

let timerInterval = null;
let timeLeft = 25 * 60;
let isRunning = false;
let isBreak = false;

function updateTimerDisplay(){
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  timerDisplay.textContent = `${m}:${s.toString().padStart(2,'0')}`;
}

function startTimer(){
  if(isRunning) return;
  isRunning = true;
  timerStart.disabled = true;
  timerPause.disabled = false;
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if(timeLeft <= 0){
      clearInterval(timerInterval);
      isRunning = false;
      if(!isBreak){
        // Focus session complete
        const today = new Date().toDateString();
        if(pomodoros.lastDate !== today){
          pomodoros.todayCount = 0;
          pomodoros.lastDate = today;
        }
        pomodoros.todayCount++;
        pomodoros.sessions.push({date:Date.now(), type:'focus'});
        save(KEYS.pomodoros, pomodoros);
        sessionsTodayEl.textContent = pomodoros.todayCount;
        
        // Send notification
        sendNotification('🍅 Focus Session Complete!', 'Great job! Time for a break.');
        alert('Focus session complete! Time for a break.');
        
        isBreak = true;
        timerLabel.textContent = 'Break Time';
        timeLeft = parseInt(breakTimeInput.value) * 60;
      } else {
        sendNotification('⏰ Break Over!', 'Ready for your next focus session?');
        alert('Break over! Ready for next session?');
        isBreak = false;
        timerLabel.textContent = 'Focus Time';
        timeLeft = parseInt(focusTimeInput.value) * 60;
      }
      updateTimerDisplay();
      timerStart.disabled = false;
      timerPause.disabled = true;
    }
  }, 1000);
}

function pauseTimer(){
  clearInterval(timerInterval);
  isRunning = false;
  timerStart.disabled = false;
  timerPause.disabled = true;
}

function resetTimer(){
  clearInterval(timerInterval);
  isRunning = false;
  isBreak = false;
  timeLeft = parseInt(focusTimeInput.value) * 60;
  timerLabel.textContent = 'Focus Time';
  updateTimerDisplay();
  timerStart.disabled = false;
  timerPause.disabled = true;
}

timerStart.addEventListener('click', startTimer);
timerPause.addEventListener('click', pauseTimer);
timerReset.addEventListener('click', resetTimer);

function initPomodoro(){
  const today = new Date().toDateString();
  if(pomodoros.lastDate === today){
    sessionsTodayEl.textContent = pomodoros.todayCount;
  } else {
    sessionsTodayEl.textContent = 0;
  }
  updateTimerDisplay();
}

// ============================================================
// HABITS MODULE
// ============================================================
let habits = load(KEYS.habits) || [];

const habitInput = qs('#habit-input');
const addHabitBtn = qs('#add-habit-btn');
const habitList = qs('#habit-list');

function renderHabits(){
  habitList.innerHTML = '';
  if(habits.length === 0){
    habitList.innerHTML = '<p style="color:#64748b">No habits tracked yet.</p>';
    return;
  }
  habits.forEach(h => {
    const el = document.createElement('div');
    el.className = 'habit';
    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = h.name;
    const streak = document.createElement('div');
    streak.className = 'streak';
    const today = new Date().toDateString();
    const lastCheck = h.lastCheck ? new Date(h.lastCheck).toDateString() : null;
    const checkedToday = lastCheck === today;
    streak.textContent = `Streak: ${h.streak} days${checkedToday ? ' ✅' : ''}`;
    info.appendChild(name);
    info.appendChild(streak);
    const btn = document.createElement('button');
    btn.textContent = checkedToday ? 'Done Today' : 'Mark Done';
    btn.disabled = checkedToday;
    btn.addEventListener('click', () => {
      const now = Date.now();
      const yesterday = new Date(now - 86400000).toDateString();
      if(!h.lastCheck || new Date(h.lastCheck).toDateString() === yesterday){
        h.streak++;
      } else {
        h.streak = 1;
      }
      h.lastCheck = now;
      save(KEYS.habits, habits);
      renderHabits();
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.style.background = '#ef4444';
    delBtn.style.marginLeft = '8px';
    delBtn.addEventListener('click', () => {
      habits = habits.filter(x => x.id !== h.id);
      save(KEYS.habits, habits);
      renderHabits();
    });
    el.appendChild(info);
    el.appendChild(btn);
    el.appendChild(delBtn);
    habitList.appendChild(el);
  });
}

function addHabit(){
  const name = habitInput.value.trim();
  if(!name) return;
  habits.push({id:uid(), name, streak:0, lastCheck:null});
  save(KEYS.habits, habits);
  habitInput.value = '';
  renderHabits();
}

addHabitBtn.addEventListener('click', addHabit);
habitInput.addEventListener('keydown', e => {
  if(e.key === 'Enter') addHabit();
});

// ============================================================
// NOTES MODULE
// ============================================================
let notes = load(KEYS.notes) || [];

const noteTitle = qs('#note-title');
const noteContent = qs('#note-content');
const addNoteBtn = qs('#add-note-btn');
const notesList = qs('#notes-list');

function renderNotes(){
  notesList.innerHTML = '';
  if(notes.length === 0){
    notesList.innerHTML = '<p style="color:#64748b">No notes created yet.</p>';
    return;
  }
  notes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'note';
    const title = document.createElement('div');
    title.className = 'note-title';
    title.textContent = n.title || 'Untitled';
    const content = document.createElement('div');
    content.className = 'note-content';
    content.textContent = n.content.slice(0, 100) + (n.content.length > 100 ? '...' : '');
    const date = document.createElement('div');
    date.className = 'note-date';
    date.textContent = new Date(n.created).toLocaleString();
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      notes = notes.filter(x => x.id !== n.id);
      save(KEYS.notes, notes);
      renderNotes();
    });
    el.appendChild(title);
    el.appendChild(content);
    el.appendChild(date);
    el.appendChild(delBtn);
    notesList.appendChild(el);
  });
}

function addNote(){
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();
  if(!content) return;
  notes.unshift({id:uid(), title, content, created:Date.now()});
  save(KEYS.notes, notes);
  noteTitle.value = '';
  noteContent.value = '';
  renderNotes();
}

addNoteBtn.addEventListener('click', addNote);

// ============================================================
// TIMETABLE MODULE
// ============================================================
let timetable = load(KEYS.timetable) || [];

const ttDay = qs('#tt-day');
const ttTime = qs('#tt-time');
const ttSubject = qs('#tt-subject');
const addTtBtn = qs('#add-tt-btn');
const timetableList = qs('#timetable-list');

function renderTimetable(){
  timetableList.innerHTML = '';
  if(timetable.length === 0){
    timetableList.innerHTML = '<p style="color:#64748b">No timetable entries yet.</p>';
    return;
  }
  const sorted = [...timetable].sort((a,b) => {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
    if(dayDiff !== 0) return dayDiff;
    return a.time.localeCompare(b.time);
  });
  sorted.forEach(t => {
    const el = document.createElement('div');
    el.className = 'tt-item';
    const info = document.createElement('div');
    info.className = 'info';
    const day = document.createElement('div');
    day.className = 'day';
    day.textContent = `${t.day} - ${t.subject}`;
    const time = document.createElement('div');
    time.className = 'time';
    time.textContent = t.time;
    info.appendChild(day);
    info.appendChild(time);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      timetable = timetable.filter(x => x.id !== t.id);
      save(KEYS.timetable, timetable);
      renderTimetable();
    });
    el.appendChild(info);
    el.appendChild(delBtn);
    timetableList.appendChild(el);
  });
}

function addTimetable(){
  const day = ttDay.value;
  const time = ttTime.value;
  const subject = ttSubject.value.trim();
  if(!time || !subject) return;
  timetable.push({id:uid(), day, time, subject});
  save(KEYS.timetable, timetable);
  ttTime.value = '';
  ttSubject.value = '';
  renderTimetable();
}

addTtBtn.addEventListener('click', addTimetable);

// ============================================================
// DASHBOARD
// ============================================================
let taskChart = null;
let pomodoroChart = null;

function renderCharts(){
  // Get last 7 days
  const last7Days = [];
  for(let i = 6; i >= 0; i--){
    const date = new Date();
    date.setDate(date.getDate() - i);
    last7Days.push(date.toLocaleDateString('en-US', {month:'short', day:'numeric'}));
  }

  // Task completion by day
  const taskCompletionData = last7Days.map(day => {
    return tasks.filter(t => {
      if(!t.completed) return false;
      const completedDate = new Date(t.created).toLocaleDateString('en-US', {month:'short', day:'numeric'});
      return completedDate === day;
    }).length;
  });

  // Pomodoro sessions by day
  const pomodoroSessionData = last7Days.map(day => {
    return (pomodoros.sessions || []).filter(s => {
      const sessionDate = new Date(s.date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
      return sessionDate === day;
    }).length;
  });

  // Task Chart
  const taskCtx = qs('#taskChart');
  if(taskChart) taskChart.destroy();
  taskChart = new Chart(taskCtx, {
    type: 'bar',
    data: {
      labels: last7Days,
      datasets: [{
        label: 'Tasks Completed',
        data: taskCompletionData,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {labels: {color: getComputedStyle(document.body).getPropertyValue('--text')}},
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {color: getComputedStyle(document.body).getPropertyValue('--muted')},
          grid: {color: getComputedStyle(document.body).getPropertyValue('--border')}
        },
        x: {
          ticks: {color: getComputedStyle(document.body).getPropertyValue('--muted')},
          grid: {color: getComputedStyle(document.body).getPropertyValue('--border')}
        }
      }
    }
  });

  // Pomodoro Chart
  const pomodoroCtx = qs('#pomodoroChart');
  if(pomodoroChart) pomodoroChart.destroy();
  pomodoroChart = new Chart(pomodoroCtx, {
    type: 'line',
    data: {
      labels: last7Days,
      datasets: [{
        label: 'Pomodoro Sessions',
        data: pomodoroSessionData,
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {labels: {color: getComputedStyle(document.body).getPropertyValue('--text')}},
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {color: getComputedStyle(document.body).getPropertyValue('--muted')},
          grid: {color: getComputedStyle(document.body).getPropertyValue('--border')}
        },
        x: {
          ticks: {color: getComputedStyle(document.body).getPropertyValue('--muted')},
          grid: {color: getComputedStyle(document.body).getPropertyValue('--border')}
        }
      }
    }
  });
}

function renderDashboard(){
  const completedTasks = tasks.filter(t => t.completed).length;
  qs('#stat-tasks').textContent = completedTasks;
  
  const today = new Date().toDateString();
  const pomodoroCount = pomodoros.lastDate === today ? pomodoros.todayCount : 0;
  qs('#stat-pomodoros').textContent = pomodoroCount;
  
  const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
  qs('#stat-streak').textContent = maxStreak;
  
  qs('#stat-notes').textContent = notes.length;
  
  renderCharts();
  
  const recentActivity = qs('#recent-activity');
  recentActivity.innerHTML = '<p style="color:var(--muted)">Keep tracking your productivity across all modules!</p>';
}

// ============================================================
// INIT
// ============================================================
renderTasks();
initPomodoro();
renderHabits();
renderNotes();
renderTimetable();
renderDashboard();
