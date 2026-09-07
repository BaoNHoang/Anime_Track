import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ProfilePage } from "../features/dashboard/ProfilePage";
import { DiscoverPage } from "../features/discover/DiscoverPage";
import { LibraryPage } from "../features/library/LibraryPage";
import { NewsPage } from "../features/news/NewsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { AccountRoute } from "../features/account/AccountPage";
import { PrivacyPage } from "../features/legal/PrivacyPage";
import { AccessibilityPage } from "../features/legal/AccessibilityPage";
import { SiteMapPage } from "../features/legal/SiteMapPage";
import { TermsPage } from "../features/legal/TermsPage";
import { RequireAuth } from "../components/RequireAuth";
import { RouteSkeleton } from "../components/LoadingState";
import { AnimePanelProvider } from "./providers/AnimePanelProvider";
import { CloudAuthProvider } from "./providers/CloudAuthProvider";
import { TrackerProvider } from "./providers/TrackerProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { WatchProvider } from "./providers/WatchProvider";
import { NotificationProvider } from "./providers/NotificationProvider";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { YearInReviewPage } from "../features/stats/YearInReviewPage";

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
    HydrateFallback: () => <RouteSkeleton label="Loading Banime" />,
    children: [
      { path: "/", element: <DashboardPage /> },
      {
        path: "/profile",
        element: <RequireAuth><ProfilePage /></RequireAuth>
      },
      { path: "/discover", element: <DiscoverPage /> },
      { path: "/calendar", lazy: async () => {
        const { WatchCalendarPage } = await import("../features/library/WatchCalendarPage");
        return { Component: () => <RequireAuth><WatchCalendarPage /></RequireAuth> };
      } },
      { path: "/lists", lazy: async () => {
        const { CustomListsPage } = await import("../features/library/CustomListsPage");
        return { Component: () => <RequireAuth><CustomListsPage /></RequireAuth> };
      } },
      { path: "/recommendations", lazy: async () => {
        const { RecommendationsPage } = await import("../features/discover/RecommendationsPage");
        return { Component: () => <RequireAuth><RecommendationsPage /></RequireAuth> };
      } },
      { path: "/news", element: <NewsPage /> },
      {
        path: "/library",
        element: <RequireAuth><LibraryPage /></RequireAuth>
      },
      {
        path: "/settings",
        element: <RequireAuth><SettingsPage /></RequireAuth>
      },
      {
        path: "/notifications",
        element: <RequireAuth><NotificationsPage /></RequireAuth>
      },
      { path: "/year-in-review", element: <YearInReviewPage /> },
      { path: "/account", element: <AccountRoute /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/accessibility", element: <AccessibilityPage /> },
      { path: "/terms", element: <TermsPage /> },
      { path: "/sitemap", element: <SiteMapPage /> }
    ]
  }
]);

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CloudAuthProvider>
          <TrackerProvider>
            <NotificationProvider>
              <WatchProvider>
                <AnimePanelProvider>
                  <RouterProvider router={router} />
                </AnimePanelProvider>
              </WatchProvider>
            </NotificationProvider>
          </TrackerProvider>
        </CloudAuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
