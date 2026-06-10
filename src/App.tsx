import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AnimePanelProvider } from "./context/AnimePanelProvider";
import { CloudAuthProvider } from "./context/CloudAuthProvider";
import { TrackerProvider } from "./context/TrackerProvider";
import { ThemeProvider } from "./context/ThemeProvider";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { DiscoverPage } from "./features/discover/DiscoverPage";
import { LibraryPage } from "./features/library/LibraryPage";
import { NewsPage } from "./features/news/NewsPage";
import { OAuthConsentPage } from "./features/oauth/OAuthConsentPage";
import { SettingsPage } from "./features/settings/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true
    }
  }
});

const router = createBrowserRouter([
  {
    path: "/oauth/consent",
    element: <OAuthConsentPage />
  },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/discover", element: <DiscoverPage /> },
      { path: "/news", element: <NewsPage /> },
      { path: "/library", element: <LibraryPage /> },
      { path: "/settings", element: <SettingsPage /> }
    ]
  }
]);

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CloudAuthProvider>
          <TrackerProvider>
            <AnimePanelProvider>
              <RouterProvider router={router} />
            </AnimePanelProvider>
          </TrackerProvider>
        </CloudAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
