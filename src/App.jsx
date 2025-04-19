import React, { useState, useEffect } from "react";

const STORAGE_KEY = "room_ranking_inference";

export default function RoomComparisonTool() {
  const [rooms, setRooms] = useState([]); // room: { name, url }
  const [graph, setGraph] = useState({}); // graph of preferences: { [roomName]: Set of losers }
  const [pendingPairs, setPendingPairs] = useState([]);
  const [currentPair, setCurrentPair] = useState(null);
  const [sortedRooms, setSortedRooms] = useState(null);
  const [showRankings, setShowRankings] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const { rooms, graph, pendingPairs, sortedRooms } = JSON.parse(savedData);
      setRooms(rooms);
      setGraph(graph);
      setPendingPairs(pendingPairs);
      setCurrentPair(pendingPairs[0] || null);
      setSortedRooms(sortedRooms);
    }
  }, []);

  const saveState = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const addComparison = (winner, loser, oldGraph) => {
    const newGraph = { ...oldGraph };
    if (!newGraph[winner.name]) newGraph[winner.name] = new Set();
    newGraph[winner.name].add(loser.name);

    if (newGraph[loser.name]) {
      for (const node of newGraph[loser.name]) {
        newGraph[winner.name].add(node);
      }
    }

    for (const [node, beats] of Object.entries(newGraph)) {
      if (beats.has(winner.name)) {
        newGraph[node].add(loser.name);
      }
    }

    // convert sets to arrays for serialization
    const serializableGraph = {};
    for (const [key, value] of Object.entries(newGraph)) {
      serializableGraph[key] = Array.from(value);
    }

    return serializableGraph;
  };

  const canInferPreference = (a, b, graph) => {
    const visited = new Set();
    const stack = [a.name];
    while (stack.length) {
      const current = stack.pop();
      if (current === b.name) return true;
      for (const neighbor of graph[current] || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    return false;
  };

  const topologicalSort = (graph, allRooms) => {
    const inDegree = {};
    const nameToRoom = {};
    for (const room of allRooms) {
      nameToRoom[room.name] = room;
      inDegree[room.name] = 0;
    }
    for (const beatList of Object.values(graph)) {
      for (const loser of beatList) {
        inDegree[loser]++;
      }
    }
    const queue = Object.keys(inDegree).filter((k) => inDegree[k] === 0);
    const sorted = [];
    while (queue.length) {
      const current = queue.shift();
      sorted.push(nameToRoom[current]);
      for (const neighbor of graph[current] || []) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }
    return sorted;
  };

  const handleInput = (e) => {
    e.preventDefault();
    const input = e.target.elements.roomInput.value.trim();
    const lines = input.split(/\r?\n/);
    const newRooms = lines
      .map((line) => line.split(","))
      .filter(([name, url]) => name && url)
      .map(([name, url]) => ({ name: name.trim(), url: url.trim() }));

    const allPairs = [];
    for (let i = 0; i < newRooms.length; i++) {
      for (let j = i + 1; j < newRooms.length; j++) {
        allPairs.push([newRooms[i], newRooms[j]]);
      }
    }

    setRooms(newRooms);
    setGraph({});
    setPendingPairs(allPairs);
    setCurrentPair(allPairs[0] || null);
    setSortedRooms(null);
    saveState({ rooms: newRooms, graph: {}, pendingPairs: allPairs, sortedRooms: null });
  };

  const handleChoice = (preferred) => {
    const [a, b] = currentPair;
    const winner = preferred;
    const loser = a === preferred ? b : a;

    const newGraph = addComparison(winner, loser, graph);

    const remaining = pendingPairs.filter(([x, y]) => {
      return !(canInferPreference(x, y, newGraph) || canInferPreference(y, x, newGraph));
    });

    const nextPair = remaining[0] || null;

    setGraph(newGraph);
    setPendingPairs(remaining);
    setCurrentPair(nextPair);

    if (!nextPair) {
      const sorted = topologicalSort(newGraph, rooms);
      setSortedRooms(sorted);
      saveState({ rooms, graph: newGraph, pendingPairs: [], sortedRooms: sorted });
    } else {
      saveState({ rooms, graph: newGraph, pendingPairs: remaining, sortedRooms: null });
    }
  };

  const handleExport = () => {
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
    setGraph({});
    setPendingPairs([]);
    setCurrentPair(null);
    setSortedRooms(null);
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

  if (sortedRooms) {
    return (
      <div style={{ padding: "1rem" }}>
        <h2 style={{ fontWeight: "bold", fontSize: "1.5rem" }}>All comparisons complete!</h2>
        <button onClick={() => setShowRankings(true)} style={{ marginRight: "0.5rem", padding: "0.5rem 1rem" }}>Show Rankings</button>
        <button onClick={handleExport} style={{ marginRight: "0.5rem", padding: "0.5rem 1rem" }}>Export Rankings</button>
        <button onClick={handleReset} style={{ padding: "0.5rem 1rem" }}>Reset</button>
        {showRankings && (
          <ol style={{ marginTop: "1rem" }}>
            {sortedRooms.map((room, i) => (
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
      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "gray" }}>Remaining comparisons: {pendingPairs.length}</p>
      <button onClick={handleReset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", width: "100%" }}>Reset</button>
    </div>
  );
}
