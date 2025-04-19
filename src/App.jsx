import React, { useState, useEffect } from "react";

// mergeSort function
const mergeSort = (arr, compareFn) => {
  if (arr.length <= 1) return arr;
  const middle = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, middle), compareFn);
  const right = mergeSort(arr.slice(middle), compareFn);
  return merge(left, right, compareFn);
};

// merge function helper for mergeSort
const merge = (left, right, compareFn) => {
  let result = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (compareFn(left[leftIndex], right[rightIndex]) <= 0) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }
  return result.concat(left.slice(leftIndex), right.slice(rightIndex));
};

const STORAGE_KEY = "room_ranking_data";

export default function RoomComparisonTool() {
  const [rooms, setRooms] = useState([]); // Each room: { name, url }
  const [comparisonQueue, setComparisonQueue] = useState([]);
  const [scores, setScores] = useState({});
  const [showRankings, setShowRankings] = useState(false);
  const [currentPair, setCurrentPair] = useState(null);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const { rooms, comparisonQueue, scores } = JSON.parse(savedData);
      setRooms(rooms);
      setScores(scores);
      setComparisonQueue(comparisonQueue);
      setCurrentPair(comparisonQueue[0] || null);
    }
  }, []);

  const saveState = (newRooms, newQueue, newScores) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ rooms: newRooms, comparisonQueue: newQueue, scores: newScores })
    );
  };

  const handleInput = (e) => {
    e.preventDefault();
    const input = e.target.elements.roomInput.value.trim();
    const lines = input.split(/\r?\n/);
    const newRooms = lines
      .map((line) => {
        const spaceIndex = line.indexOf(" ");
        if (spaceIndex === -1) return null;
        const name = line.substring(0, spaceIndex).trim();
        const url = line.substring(spaceIndex + 1).trim();
        return name && url ? { name, url } : null;
      })
      .filter(Boolean);

    const initialScores = Object.fromEntries(newRooms.map((r) => [r.name, 0]));
    const shuffledPairs = [];
    for (let i = 0; i < newRooms.length; i++) {
      for (let j = i + 1; j < newRooms.length; j++) {
        shuffledPairs.push([newRooms[i], newRooms[j]]);
      }
    }
    shuffledPairs.sort(() => Math.random() - 0.5);

    setRooms(newRooms);
    setScores(initialScores);
    setComparisonQueue(shuffledPairs);
    setCurrentPair(shuffledPairs[0]);
    saveState(newRooms, shuffledPairs, initialScores);
  };

  const handleChoice = (preferred) => {
    const [first, second] = currentPair;
    const updatedScores = { ...scores };
    updatedScores[preferred.name] += 1;

    const remainingQueue = comparisonQueue.slice(1);
    const nextPair = remainingQueue[0] || null;
    setScores(updatedScores);
    setComparisonQueue(remainingQueue);
    setCurrentPair(nextPair);
    saveState(rooms, remainingQueue, updatedScores);
  };

  const handleExport = () => {
    // mergeSort rooms based on scores
    const sortedRooms = mergeSort([...rooms], (a, b) => scores[b.name] - scores[a.name]);
    const csv = sortedRooms.map((r, i) => `${i + 1},${r.name},${r.url}`).join("\n");
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
    setComparisonQueue([]);
    setScores({});
    setCurrentPair(null);
    setShowRankings(false);
  };

  if (!rooms.length) {
    return (
      <form onSubmit={handleInput} style={{ padding: "1rem" }}>
        <h2 style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
          Paste room data (RoomName URL per line):
        </h2>
        <textarea
          name="roomInput"
          rows={10}
          style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
          placeholder={`RoomA https://photos.app.goo.gl/... \nRoomB https://photos.app.goo.gl/...`}
        />
        <button type="submit" style={{ marginTop: "0.5rem", padding: "0.5rem 1rem" }}>
          Start Comparing
        </button>
      </form>
    );
  }

  if (!currentPair) {
    return (
      <div style={{ padding: "1rem" }}>
        <h2 style={{ fontWeight: "bold", fontSize: "1.5rem" }}>All comparisons complete!</h2>
        <button onClick={() => setShowRankings(true)} style={{ marginRight: "0.5rem", padding: "0.5rem 1rem" }}>
          Show Rankings
        </button>
        <button onClick={handleExport} style={{ marginRight: "0.5rem", padding: "0.5rem 1rem" }}>
          Export Rankings
        </button>
        <button onClick={handleReset} style={{ marginRight: "0.5rem", padding: "0.5rem 1rem" }}>
          Reset
        </button>
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
      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "gray" }}>
        Remaining comparisons: {comparisonQueue.length}
      </p>
    </div>
  );
}
