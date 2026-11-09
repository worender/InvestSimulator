import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { ReadableArticle } from "./components/NewsArticleModal";
import {
  EDUCATIONAL_ARTICLES,
  type EducationalArticle,
} from "./database/educationalArticles";

const DEFAULT_SAVED: readonly ReadableArticle[] = ["edu-01", "edu-04"]
  .map((id) => EDUCATIONAL_ARTICLES.find((article) => article.id === id))
  .filter((article): article is EducationalArticle => article !== undefined);

type SavedArticlesContextValue = {
  articles: readonly ReadableArticle[];
  isSaved: (id: string) => boolean;
  toggle: (article: ReadableArticle) => void;
};

const SavedArticlesContext = createContext<SavedArticlesContextValue | null>(
  null,
);

export function SavedArticlesProvider({ children }: PropsWithChildren) {
  const [articles, setArticles] =
    useState<readonly ReadableArticle[]>(DEFAULT_SAVED);

  const isSaved = useCallback(
    (id: string) => articles.some((item) => item.id === id),
    [articles],
  );

  const toggle = useCallback((article: ReadableArticle) => {
    setArticles((current) =>
      current.some((item) => item.id === article.id)
        ? current.filter((item) => item.id !== article.id)
        : [article, ...current],
    );
  }, []);

  const value = useMemo(
    () => ({ articles, isSaved, toggle }),
    [articles, isSaved, toggle],
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
