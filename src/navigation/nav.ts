import { useCallback, useMemo } from "react";
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";

import { useAuth } from "@/auth/AuthContext";
import { openExternal } from "@/lib/device";
import { routeForPath, tabsHostFor, type RouteName, type RouteParams } from "@/navigation/routes";

interface Nav {
  /** Open a screen by name: go("StudentPayments") or go("StudentSettings", { tab: "notifications" }) */
  go: (name: RouteName, params?: RouteParams) => void;
  /** Go back one screen (does nothing on a tab's first screen) */
  back: () => void;
  /**
   * Open a website-style address: "/student/classes" opens that screen, an https link opens outside the app.
   * Returns false when the address leads nowhere.
   */
  openPath: (url: string | null | undefined) => boolean;
}

/** Navigation for screens: by route name, or by the website path a notification or shortcut carries */
export function useNav(): Nav {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const role = user?.role;

  const go = useCallback(
    (name: RouteName, params?: RouteParams) => {
      const host = tabsHostFor(name);
      // A tab lives inside the tabs host at the bottom of the stack. popTo returns to that host (closing any
      // pushed pages above it) instead of stacking a second copy of the tabs, which navigate() would do.
      if (host) navigation.dispatch(StackActions.popTo(host, { screen: name, params }));
      else navigation.navigate(name, params);
    },
    [navigation]
  );

  const back = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const openPath = useCallback(
    (url: string | null | undefined) => {
      const target = routeForPath(url);
      if (target) {
        // A student's phone never opens teacher screens, and the other way round
        const forRole = target.name.startsWith("Student") ? "student" : target.name.startsWith("Teacher") ? "teacher" : role;
        if (forRole !== role) return false;
        go(target.name, target.params);
        return true;
      }
      if (url && /^(https?:|tel:|mailto:)/i.test(url)) {
        void openExternal(url);
        return true;
      }
      return false;
    },
    [go, role]
  );

  return useMemo(() => ({ go, back, openPath }), [go, back, openPath]);
}

/** The params the current screen was opened with (e.g. { tab: "notifications" }) */
export function useRouteParams<T extends Record<string, unknown> = Record<string, unknown>>(): Partial<T> {
  const route = useRoute();
  return ((route.params as Partial<T> | undefined) ?? {}) as Partial<T>;
}
