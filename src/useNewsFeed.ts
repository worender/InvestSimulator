import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  getYahooNewsByTopic,
  type NewsTopic,
  type YahooNewsItem,
} from "./api/newsService";

// Po tym czasie lista newsów jest uznawana za nieaktualną i pobierana ponownie
export const NEWS_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
// Jak często sprawdzamy, czy minęło już 30 minut (timer sam w sobie bywa niedokładny)
const STALE_CHECK_INTERVAL_MS = 60 * 1000;

type NewsByTopic = Record<NewsTopic, YahooNewsItem[]>;

const EMPTY_NEWS: NewsByTopic = { poland: [], world: [] };

/**
 * Newsy dla ekranu „O inwestowaniu” z automatycznym odświeżaniem.
 *
 * Pobiera listę przy wejściu, a potem ponownie, gdy dane mają co najmniej 30 minut:
 * co minutę sprawdza wiek danych, gdy aplikacja jest aktywna, i od razu po powrocie
 * aplikacji z tła (na telefonie timery w tle są wstrzymywane).
 * Odświeżanie jest ciche — bez szkieletu ładowania i powiadomień; przy błędzie
 * zostaje poprzednia lista.
 */
export function useNewsFeed(limit: number) {
  const [newsByTopic, setNewsByTopic] = useState<NewsByTopic>(EMPTY_NEWS);
  const [loading, setLoading] = useState(true);
  const lastFetchedAt = useRef(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const load = useCallback(
    async (silent: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const items = await getYahooNewsByTopic(limit, { silent });
        if (!mounted.current) return;

        const hasNews = items.poland.length > 0 || items.world.length > 0;
        // Nieudane odświeżenie w tle nie czyści listy, którą użytkownik już widzi
        if (hasNews || !silent) setNewsByTopic(items);
        if (hasNews) lastFetchedAt.current = Date.now();
        setLoading(false);
      } finally {
        inFlight.current = false;
      }
    },
    [limit],
  );

  useEffect(() => {
    mounted.current = true;
    load(false);

    const refreshIfStale = () => {
      if (AppState.currentState !== "active") return;
      if (Date.now() - lastFetchedAt.current < NEWS_REFRESH_INTERVAL_MS) return;
      load(true);
    };

    const timer = setInterval(refreshIfStale, STALE_CHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshIfStale();
    });

    return () => {
      mounted.current = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [load]);

  return { newsByTopic, loading };
}
