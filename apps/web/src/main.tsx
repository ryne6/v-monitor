import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import Dashboard from './pages/Dashboard';
import Errors from './pages/Errors';
import Stats from './pages/Stats';
import Test from './pages/Test';
import { getMonitor } from './sdk/monitor';
import './styles.css';
import './shim-rrweb';

getMonitor();
const queryClient = new QueryClient();

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <Dashboard /> },
        { path: 'errors', element: <Errors /> },
        { path: 'stats', element: <Stats /> },
        { path: 'test', element: <Test /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
