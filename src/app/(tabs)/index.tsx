import { useEffect, useState } from "react";
import { View, StyleSheet, Button, TextInput, Pressable, ActivityIndicator } from "react-native";
import Ionicons from '@expo/vector-icons/AntDesign';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { getStockCandles, CandleData } from '../../api/marketService';




export default function Index() {
  const [value, setValue] = useState("0");
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("PKO"); // Domyślna spółka z GPW

  useEffect(() => {
    const fetchCandles = async () => {
      setLoading(true);
      const data = await getStockCandles(symbol, '1h', 5);
      if (data) {
        setCandles(data);
      }
      setLoading(false);
    };

    fetchCandles();
  }, [symbol]);

  const changeValue = (amount: number) => {
    const currentValue = Number.parseInt(value);
    if (isNaN(currentValue)) {
      setValue(String(amount));
    } else {
      setValue(String(currentValue + amount));
    }
  };

  

  return (
    <View style={styles.container}>
  
        <View style={styles.chartContainer}>
          {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : candles.length > 0 ? (
          <CandlestickChart.Provider data={candles}>
            <CandlestickChart height={300}>
              <CandlestickChart.Candles />
              <CandlestickChart.Crosshair>
                <CandlestickChart.Tooltip />
              </CandlestickChart.Crosshair>
            </CandlestickChart>
          </CandlestickChart.Provider>
        ) : (
          <Ionicons name="line-chart" size={300} color="#fff" style={{ alignSelf: 'center' }} />
        )}
        </View>

        <View style={  styles.inOneLine }>
          <Pressable style={styles.plusMinus} onPress={() => changeValue(-1)}>
            <Ionicons name="minus"  color="#fff" />
          </Pressable>
                  <TextInput
                    placeholder="0"
                    keyboardType="numeric"
                    style={ styles.valueInput }
                    value={value}
                    onChangeText={setValue}
                  />
          <Pressable style={styles.plusMinus} onPress={() => changeValue(1)}>
            <Ionicons name={'plus'}  color="#fff" />
          </Pressable>
        </View>

        <View style={  styles.inOneLine }>
          <Button title="Kup"  />
          <Button title="Sprzedaj" />
        </View>

        
      
    </View>
  );
}



const styles = StyleSheet.create({
  inOneLine: {
    display: 'flex', 
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  container: {
    flex: 1,
    backgroundColor: "#25292e",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
  },

  button: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
    borderRadius: 5,
  },
  
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },

  plusMinus: {
    borderRadius: 25,
    width: 50,
    height: 50,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#646464',
  },

  valueInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    width: 100,
    textAlign: 'center',
    color: '#fff',
  },

  chartContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    backgroundColor: '#16181b',
    marginTop: 10,
  }
});
