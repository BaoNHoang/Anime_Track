import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { DiscoverPage } from "../features/discover/DiscoverPage";
import { LibraryPage } from "../features/library/LibraryPage";
import { NewsPage } from "../features/news/NewsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { AccountPage } from "../features/account/AccountPage";
import { AnimePanelProvider } from "./providers/AnimePanelProvider";
import { CloudAuthProvider } from "./providers/CloudAuthProvider";
import { TrackerProvider } from "./providers/TrackerProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { WatchProvider } from "./providers/WatchProvider";

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
      { path: "/news", element: <NewsPage /> },
      { path: "/library", element: <LibraryPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/account", element: <AccountPage /> }
    ]
  }
]);

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CloudAuthProvider>
          <TrackerProvider>
            <WatchProvider>
              <AnimePanelProvider>
                <RouterProvider router={router} />
              </AnimePanelProvider>
            </WatchProvider>
          </TrackerProvider>
        </CloudAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
