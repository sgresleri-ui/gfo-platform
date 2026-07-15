import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [data, setData] = useState({
    netWorth: 0,
    liquidity: 0,
    investments: 0,
    realEstate: 0,
    liabilities: 0,
  });

  useEffect(() => {
  fetch("http://localhost:3000/dashboard")
    .then((res) => {
      console.log("STATUS", res.status);
      return res.json();
    })
    .then((json) => {
      console.log("DATA", json);
      setData(json);
    })
    .catch((err) => {
      console.error("FETCH ERROR", err);
    });
}, []);

  const euro = (value: number) =>
    value.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    });

  return (
    <div className="app">
      <header className="header">
        <h1>GFO Platform</h1>
        <p>Family Office – Stefano Gresleri</p>
      </header>

      <main className="dashboard">
        <div className="card">
          <h2>Net Worth</h2>
          <span>{euro(data.netWorth)}</span>
        </div>

        <div className="card">
          <h2>Liquidity</h2>
          <span>{euro(data.liquidity)}</span>
        </div>

        <div className="card">
          <h2>Investments</h2>
          <span>{euro(data.investments)}</span>
        </div>

        <div className="card">
          <h2>Real Estate</h2>
          <span>{euro(data.realEstate)}</span>
        </div>

        <div className="card">
          <h2>Liabilities</h2>
          <span>{euro(data.liabilities)}</span>
        </div>
      </main>
    </div>
  );
}

export default App;