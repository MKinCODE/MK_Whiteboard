import './style.css';
import { WhiteboardApp } from './engine/WhiteboardApp.js';

// Initialize the Microsoft Whiteboard application
const appElement = document.querySelector('#app');
const app = new WhiteboardApp(appElement);

// Expose app on window for debugging/inspection
window.whiteboardApp = app;
