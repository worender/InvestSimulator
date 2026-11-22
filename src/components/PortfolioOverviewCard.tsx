import { StyleSheet, View } from "react-native";
import { usePortfolios } from "../portfolio/PortfolioProvider";
import { SinglePortfolioCard } from "./SinglePortfolioCard";

export function PortfolioOverviewCard() {
  const { activePortfolio } = usePortfolios();

  if (!activePortfolio) return null;

  return (
    <View style={styles.wrapper}>
      <SinglePortfolioCard portfolio={activePortfolio} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
});
