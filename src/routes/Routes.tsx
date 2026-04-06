import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '../App';
import { AppWrapper } from '../AppWrapper';
import { DashboardPage } from '../pages/DashboardPage';
import Layout from '../styles/Layout';

interface CustomWindow extends Window {
  _qdnBase: string;
}
const customWindow = window as unknown as CustomWindow;
const baseUrl = customWindow?._qdnBase || '';

export function Routes() {
  const router = createBrowserRouter(
    [
      {
        path: '/',
        element: <AppWrapper />,
        children: [
          {
            element: <Layout />,
            children: [
              {
                index: true,
                element: <App />,
              },
              {
                path: 'dashboard',
                element: <DashboardPage />,
              },
            ],
          },
        ],
      },
    ],
    {
      basename: baseUrl,
    }
  );

  return <RouterProvider router={router} />;
}
