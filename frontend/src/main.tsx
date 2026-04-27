import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AppProvider } from './context/AppContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AdminAuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
