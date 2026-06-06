import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AnimePanelProvider } from "./context/AnimePanelContext";
import { TrackerProvider } from "./context/TrackerContext";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { DiscoverPage } from "./features/discover/DiscoverPage";
import { LibraryPage } from "./features/library/LibraryPage";
import { SettingsPage } from "./features/settings/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/discover", element: <DiscoverPage /> },
      { path: "/library", element: <LibraryPage /> },
      { path: "/settings", element: <SettingsPage /> }
    ]
  }
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TrackerProvider>
        <AnimePanelProvider>
          <RouterProvider router={router} />
        </AnimePanelProvider>
      </TrackerProvider>
    </QueryClientProvider>
  );
}
