import React, { useState, useEffect } from "react";

const generatePairs = (items) => {
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
};

const STORAGE_KEY = "room_ranking_data";

export default function RoomComparisonTool() {
  const [rooms, setRooms] = useState([]); // Each room: { name, url }
  const [currentPair, setCurrentPair] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [scores, setScores] = useState({});
  const [showRankings, setShowRankings] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const { rooms, pairs, scores } = JSON.parse(savedData);
      setRooms(rooms);
      setPairs(pairs);
      setScores(scores);
      setCurrentPair(pairs[0] || null);
    }
  }, []);

  const saveState = (newRooms, newPairs, newScores) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rooms: newRooms, pairs: newPairs, scores: newScores })
    );
  };

  const handleInput = (e) => {
    e.preventDefault();
    const input = e.target.elements.roomInput.value.trim();
    const lines = input.split(/\r?\n/);
    const newRooms = lines
      .map((line) => line.split(","))
      .filter(([name, url]) => name && url)
      .map(([name, url]) => ({ name: name.trim(), url: url.trim() }));
    const newPairs = generatePairs(newRooms);
    const initialScores = Object.fromEntries(newRooms.map((r) => [r.name, 0]));
    setRooms(newRooms);
    setPairs(newPairs);
    setScores(initialScores);
    setCurrentPair(newPairs[0]);
    saveState(newRooms, newPairs, initialScores);
  };

  const handleChoice = (preferred) => {
    const updatedScores = { ...scores };
    updatedScores[preferred.name] += 1;
    const remainingPairs = pairs.slice(1);
    const nextPair = remainingPairs[0] || null;
    setScores(updatedScores);
    setPairs(remainingPairs);
    setCurrentPair(nextPair);
    saveState(rooms, remainingPairs, updatedScores);
  };

  const handleExport = () => {
    const sorted = [...rooms].sort((a, b) => scores[b.name] - scores[a.name]);
    const csv = sorted.map((r, i) => `${i + 1},${r.name},${r.url}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "room_rankings.csv";
    link.click();
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRooms([]);
    setPairs([]);
    setScores({});
    setCurrentPair(null);
    setShowRankings(false);
  };

  if (!rooms.length) {
    return (
      <form onSubmit={handleInput} style={{ padding: "1rem" }}>
        <h2 style={{ fontWeight: "bold", fontSize: "1.2rem" }}>Paste room data as CSV (Room Name,URL per line):</h2>
        <textarea name="roomInput" rows={10} style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }} placeholder={`Room A,https://photos.app.goo.gl/link-here...\nRoom B,https://photos.app.goo.gl/link-here...`} />
        <button type="submit" style={{ marginTop: "0.5rem", padding: "0.5rem 1rem" }}>Start Comparing</button>
      </form>
    );
  }

  if (!currentPair) {
    return (
      <div style={{ padding: "1rem" }}>
        <h2 style={{ fontWeight: "bold", fontSize: "1.5rem" }}>All comparisons complete!</h2>
        <button onClick={() => setShowRankings(true)} style={{ marginRight: "0.5rem", padding: "0.5rem 1rem" }}>Show Rankings</button>
        <button onClick={handleExport} style={{ marginRight: "0.5rem", padding: "0.5rem 1rem" }}>Export Rankings</button>
        <button onClick={handleReset} style={{ padding: "0.5rem 1rem" }}>Reset</button>
        {showRankings && (
          <ol style={{ marginTop: "1rem" }}>
            {[...rooms]
              .sort((a, b) => scores[b.name] - scores[a.name])
              .map((room, i) => (
                <li key={i}>
                  <a href={room.url} target="_blank" rel="noopener noreferrer" style={{ color: "blue" }}>
                    {room.name}
                  </a>
                </li>
              ))}
          </ol>
        )}
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
      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "gray" }}>Remaining comparisons: {pairs.length}</p>
    </div>
  );
}
