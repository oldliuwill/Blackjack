import './style.css';
import { createApp } from './ui/app.ts';
import { bindControls } from './ui/controls.ts';
import { mountTable, render } from './ui/render.ts';
import { browserStorage } from './ui/storage.ts';

const root = document.querySelector<HTMLElement>('#app');
if (!root) {
  throw new Error('Missing #app element');
}

const app = createApp(browserStorage());
const table = mountTable(root);
bindControls(table, app);
app.subscribe((view) => render(table, view));
render(table, app.view());
