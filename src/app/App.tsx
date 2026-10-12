import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { RequireAuth } from "../components/RequireAuth";
import { RouteSkeleton } from "../components/LoadingState";
import { AnimePanelProvider } from "./providers/AnimePanelProvider";
import { CloudAuthProvider } from "./providers/CloudAuthProvider";
import { TrackerProvider } from "./providers/TrackerProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { WatchProvider } from "./providers/WatchProvider";
import { NotificationProvider } from "./providers/NotificationProvider";

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
      { path: "/", lazy: async () => {
        const { DashboardPage } = await import("../features/dashboard/DashboardPage");
        return { Component: DashboardPage };
      } },
      {
        path: "/profile",
        lazy: async () => {
          const { ProfilePage } = await import("../features/dashboard/ProfilePage");
          return { Component: () => <RequireAuth><ProfilePage /></RequireAuth> };
        }
      },
      { path: "/discover", lazy: async () => {
        const { DiscoverPage } = await import("../features/discover/DiscoverPage");
        return { Component: DiscoverPage };
      } },
      { path: "/calendar", lazy: async () => {
        const { WatchCalendarPage } = await import("../features/library/WatchCalendarPage");
        return { Component: () => <RequireAuth><WatchCalendarPage /></RequireAuth> };
      } },
      { path: "/lists", lazy: async () => {
        const { CustomListsPage } = await import("../features/library/CustomListsPage");
        return { Component: () => <RequireAuth><CustomListsPage /></RequireAuth> };
      } },
      { path: "/shared-list", lazy: async () => {
        const { SharedListPage } = await import("../features/library/SharedListPage");
        return { Component: SharedListPage };
      } },
      { path: "/recommendations", lazy: async () => {
        const { RecommendationsPage } = await import("../features/discover/RecommendationsPage");
        return { Component: () => <RequireAuth><RecommendationsPage /></RequireAuth> };
      } },
      { path: "/news", lazy: async () => {
        const { NewsPage } = await import("../features/news/NewsPage");
        return { Component: NewsPage };
      } },
      {
        path: "/library",
        lazy: async () => {
          const { LibraryPage } = await import("../features/library/LibraryPage");
          return { Component: () => <RequireAuth><LibraryPage /></RequireAuth> };
        }
      },
      {
        path: "/settings",
        lazy: async () => {
          const { SettingsPage } = await import("../features/settings/SettingsPage");
          return { Component: () => <RequireAuth><SettingsPage /></RequireAuth> };
        }
      },
      {
        path: "/notifications",
        lazy: async () => {
          const { NotificationsPage } = await import("../features/notifications/NotificationsPage");
          return { Component: () => <RequireAuth><NotificationsPage /></RequireAuth> };
        }
      },
      { path: "/year-in-review", lazy: async () => {
        const { YearInReviewPage } = await import("../features/stats/YearInReviewPage");
        return { Component: YearInReviewPage };
      } },
      { path: "/account", lazy: async () => {
        const { AccountRoute } = await import("../features/account/AccountPage");
        return { Component: AccountRoute };
      } },
      { path: "/privacy", lazy: async () => {
        const { PrivacyPage } = await import("../features/legal/PrivacyPage");
        return { Component: PrivacyPage };
      } },
      { path: "/accessibility", lazy: async () => {
        const { AccessibilityPage } = await import("../features/legal/AccessibilityPage");
        return { Component: AccessibilityPage };
      } },
      { path: "/terms", lazy: async () => {
        const { TermsPage } = await import("../features/legal/TermsPage");
        return { Component: TermsPage };
      } },
      { path: "/sitemap", lazy: async () => {
        const { SiteMapPage } = await import("../features/legal/SiteMapPage");
        return { Component: SiteMapPage };
      } }
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
