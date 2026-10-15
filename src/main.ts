import './style.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) {
  throw new Error('Missing #app element');
}

// Placeholder until TASK-004 wires the UI to the engine.
const heading = document.createElement('h1');
heading.textContent = 'Blackjack';
app.replaceChildren(heading);
