import Ionicons from '@expo/vector-icons/AntDesign';
import { useState } from "react";
import { Button, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LineChart } from "react-native-wagmi-charts";



export default function Index() {
  const [value, setValue] = useState("0");

  const changeValue = (amount: number) => {
    const currentValue = Number.parseInt(value);
    if (isNaN(currentValue)) {
      setValue(String(amount));
    } else {
      setValue(String(currentValue + amount));
    }
  };

  return (
    <GestureHandlerRootView>
      <View style={styles.container}>
        
          
        

        <View style={styles.chartContainer}>
          <Chart1 />
          {/* <Ionicons name="line-chart" size={300} color="#fff" style={{ alignSelf: 'center' }} /> */}
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
    </GestureHandlerRootView>
  );
}

const data = [
  {
    timestamp: 1625945400000,
    value: 33575.25,
  },
  {
    timestamp: 1625946300000,
    value: 33545.25,
  },
  {
    timestamp: 1625947200000,
    value: 33510.25,
  },
  {
    timestamp: 1625948100000,
    value: 33215.25,
  },
  {
    timestamp: 1625949000000,
    value: 33275.25,
  },
  {
    timestamp: 1625949900000,
    value: 33315.25,
  },
  {
    timestamp: 1625950800000,
    value: 33415.25,
  }, 
  { 
    timestamp: 1625951700000,
    value: 33455.25,
  },
  {
    timestamp: 1625952600000,
    value: 33475.25,
  },
  {
    timestamp: 1625953500000,
    value: 33495.25,
  },       
];

function Chart1() {
  const { width} = useWindowDimensions();
  const CHART_WIDTH = width * 0.9;
  const CHART_HEIGHT = Math.min(CHART_WIDTH * 0.90, 500); // proporcja ~16:9

 

  return (
    <LineChart.Provider data={data}>
      <LineChart width={CHART_WIDTH} height={CHART_HEIGHT}>
        <LineChart.Path color={"white"} />
        <LineChart.CursorCrosshair color="#ff9800" />
      </LineChart>
      <LineChart.PriceText style={styles.textChart} />
      <LineChart.DatetimeText style={styles.textChart} />
    </LineChart.Provider>
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
    width: '95%',
    backgroundColor: '#16181b',
    alignItems: 'center',
    borderRadius: 40,
  },

  textChart: {
    color: "#00ff88",
    fontSize: 14,
  }
});
