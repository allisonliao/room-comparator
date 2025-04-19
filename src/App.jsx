import React, { useState, useEffect } from "react";

const STORAGE_KEY = "room_elo_ranking_data";
const DEFAULT_RATING = 1000;
const K = 32; // elo sensitivity

export default function RoomEloTool() {
  const [rooms, setRooms] = useState([]); // room: { name, url, rating }
  const [currentPair, setCurrentPair] = useState(null);
  const [history, setHistory] = useState([]);
  const [showRankings, setShowRankings] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { rooms, history } = JSON.parse(saved);
      setRooms(rooms);
      setHistory(history);
      pickPair(rooms);
    }
  }, []);

  const saveState = (rooms, history) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rooms, history }));
  };

  const handleInput = (e) => {
    e.preventDefault();
    const input = e.target.elements.roomInput.value.trim();
    const lines = input.split(/\r?\n/);
    const newRooms = lines
      .map((line) => line.split(","))
      .filter(([name, url]) => name && url)
      .map(([name, url]) => ({ name: name.trim(), url: url.trim(), rating: DEFAULT_RATING }));

    setRooms(newRooms);
    setHistory([]);
    pickPair(newRooms);
    saveState(newRooms, []);
  };

  const expectedScore = (ratingA, ratingB) => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  };

  const updateRatings = (winner, loser) => {
    const E_winner = expectedScore(winner.rating, loser.rating);
    const E_loser = expectedScore(loser.rating, winner.rating);

    const winnerNew = { ...winner, rating: winner.rating + K * (1 - E_winner) };
    const loserNew = { ...loser, rating: loser.rating + K * (0 - E_loser) };

    return [winnerNew, loserNew];
  };

  const pickPair = (roomList) => {
    if (roomList.length < 2) return;
    // sort by rating and pick two rooms with closest ratings randomly
    const sorted = [...roomList].sort((a, b) => a.rating - b.rating);
    let idx = Math.floor(Math.random() * (sorted.length - 1));
    if (sorted.length > 5) idx = Math.floor(Math.random() * (sorted.length - 5));
    const pair = [sorted[idx], sorted[idx + 1]];
    setCurrentPair(pair);
  };

  const handleChoice = (chosen) => {
    const [a, b] = currentPair;
    const winner = chosen.name === a.name ? a : b;
    const loser = chosen.name === a.name ? b : a;

    const [newWinner, newLoser] = updateRatings(winner, loser);
    const updatedRooms = rooms.map((r) => {
      if (r.name === newWinner.name) return newWinner;
      if (r.name === newLoser.name) return newLoser;
      return r;
    });

    const newHistory = [...history, { winner: newWinner.name, loser: newLoser.name }];
    setRooms(updatedRooms);
    setHistory(newHistory);
    pickPair(updatedRooms);
    saveState(updatedRooms, newHistory);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRooms([]);
    setCurrentPair(null);
    setHistory([]);
    setShowRankings(false);
  };

  const handleExport = () => {
    const csv = rooms
      .sort((a, b) => b.rating - a.rating)
      .map((r, i) => `${i + 1},${r.name},${r.url},${Math.round(r.rating)}`)
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "room_elo_rankings.csv";
    link.click();
  };

  if (!rooms.length) {
    return (
      <form onSubmit={handleInput} style={{ padding: "1rem" }}>
        <h2 style={{ fontWeight: "bold", fontSize: "1.2rem" }}>Paste room data as CSV (Room Name,URL per line):</h2>
        <textarea
          name="roomInput"
          rows={10}
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
          placeholder={`Room A,https://photos.app.goo.gl/...\nRoom B,https://photos.app.goo.gl/...`}
        />
        <button type="submit" style={{ marginTop: "0.5rem", padding: "0.5rem 1rem" }}>
          Start Ranking
        </button>
      </form>
    );
  }

  if (showRankings) {
    const sorted = [...rooms].sort((a, b) => b.rating - a.rating);
    return (
      <div style={{ padding: "1rem" }}>
        <h2 style={{ fontWeight: "bold", fontSize: "1.5rem" }}>Room Rankings (Elo Style)</h2>
        <button onClick={() => setShowRankings(false)} style={{ marginBottom: "1rem" }}>
          Back to Comparisons
        </button>
        <ol>
          {sorted.map((room, i) => (
            <li key={i}>
              <a href={room.url} target="_blank" rel="noopener noreferrer">{room.name}</a> — {Math.round(room.rating)}
            </li>
          ))}
        </ol>
        <button onClick={handleExport} style={{ marginTop: "1rem" }}>Export Rankings</button>
        <button onClick={handleReset} style={{ marginLeft: "0.5rem" }}>Reset</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2 style={{ fontWeight: "bold", fontSize: "1.2rem" }}>Which room do you prefer?</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
        {currentPair.map((room) => (
          <div key={room.name} style={{ flex: 1, minWidth: "300px" }}>
            <p style={{ fontWeight: "bold" }}>{room.name}</p>
            <a href={room.url} target="_blank" rel="noopener noreferrer">
              <button style={{ padding: "0.5rem 1rem", width: "100%" }}>Open Room Album</button>
            </a>
            <button
              onClick={() => handleChoice(room)}
              style={{ marginTop: "0.5rem", padding: "0.5rem 1rem", width: "100%" }}
            >
              Choose This Room
            </button>
          </div>
        ))}
      </div>
      <button onClick={() => setShowRankings(true)} style={{ marginTop: "1rem", padding: "0.5rem 1rem", width: "100%" }}>
        View Rankings
      </button>
      <button onClick={handleReset} style={{ marginTop: "0.5rem", padding: "0.5rem 1rem", width: "100%" }}>
        Reset
      </button>
    </div>
  );
}