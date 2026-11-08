import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { ReadableArticle } from "./components/NewsArticleModal";
import {
  getEducationalArticles,
  getSavedArticleSlugs,
  setArticleSaved,
} from "./database/database";
import type { EducationalArticle } from "./database/educationalArticles";
import { notify } from "./notificationBus";
import { useTheme } from "./theme";

type SavedArticlesContextValue = {
  // Wszystkie artykuły edukacyjne z bazy (null podczas ładowania)
  educationalArticles: readonly EducationalArticle[] | null;
  // Artykuły „do przeczytania później” aktywnego konta (tabela saved_article)
  articles: readonly EducationalArticle[];
  isSaved: (id: string) => boolean;
  toggle: (article: ReadableArticle) => void;
};

const SavedArticlesContext = createContext<SavedArticlesContextValue | null>(
  null,
);

export function SavedArticlesProvider({ children }: PropsWithChildren) {
  const { activeAccount } = useTheme();
  const userId = activeAccount?.id;

  const [educationalArticles, setEducationalArticles] = useState<
    readonly EducationalArticle[] | null
  >(null);
  const [savedSlugs, setSavedSlugs] = useState<readonly string[]>([]);

  useEffect(() => {
    let active = true;

    getEducationalArticles()
      .then((articles) => {
        if (active) setEducationalArticles(articles);
      })
      .catch((error) => {
        console.error("Nie udało się wczytać artykułów edukacyjnych:", error);
        if (!active) return;
        setEducationalArticles([]);
        notify({
          variant: "error",
          title: "Nie udało się wczytać artykułów",
          message: "Spróbuj ponownie uruchomić aplikację.",
        });
      });

    return () => {
      active = false;
    };
  }, []);

  // Zakładki należą do konta, więc odświeżają się przy jego zmianie
  useEffect(() => {
    if (userId === undefined) return;
    let active = true;

    getSavedArticleSlugs(userId)
      .then((slugs) => {
        if (active) setSavedSlugs(slugs);
      })
      .catch((error) => {
        console.error("Nie udało się wczytać zapisanych artykułów:", error);
        if (!active) return;
        notify({
          variant: "error",
          title: "Nie udało się wczytać zapisanych artykułów",
          message: "Lista „Zapisane” może być niepełna.",
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const articles = useMemo(
    () =>
      savedSlugs
        .map((slug) => educationalArticles?.find((item) => item.id === slug))
        .filter((article): article is EducationalArticle => !!article),
    [educationalArticles, savedSlugs],
  );

  const isSaved = useCallback(
    (id: string) => savedSlugs.includes(id),
    [savedSlugs],
  );

  const toggle = useCallback(
    (article: ReadableArticle) => {
      if (userId === undefined) return;
      const id = article.id;
      const wasSaved = savedSlugs.includes(id);

      const add = (current: readonly string[]) => [id, ...current];
      const remove = (current: readonly string[]) =>
        current.filter((slug) => slug !== id);

      // Natychmiastowa zmiana w UI, cofana, jeśli zapis do bazy się nie uda
      setSavedSlugs(wasSaved ? remove : add);

      setArticleSaved(id, !wasSaved, userId).catch((error) => {
        console.error("Nie udało się zapisać zakładki:", error);
        setSavedSlugs(wasSaved ? add : remove);
        notify({
          variant: "error",
          title: wasSaved
            ? "Nie udało się usunąć z zapisanych"
            : "Nie udało się zapisać artykułu",
          message: "Spróbuj ponownie za chwilę.",
        });
      });
    },
    [savedSlugs, userId],
  );

  const value = useMemo(
    () => ({ educationalArticles, articles, isSaved, toggle }),
    [educationalArticles, articles, isSaved, toggle],
  );

  return (
    <SavedArticlesContext.Provider value={value}>
      {children}
    </SavedArticlesContext.Provider>
  );
}

export function useSavedArticles() {
  const value = useContext(SavedArticlesContext);
  if (!value) {
    throw new Error(
      "useSavedArticles musi zostać użyty w SavedArticlesProvider",
    );
  }
  return value;
}
