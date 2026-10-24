import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ClinicalErrorBoundary } from './components/InfoPagesView.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClinicalErrorBoundary>
      <App />
    </ClinicalErrorBoundary>
  </React.StrictMode>
);
