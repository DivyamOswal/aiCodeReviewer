export default function ModelSwitcher({ model, setModel }) {
  return (
    <select
      value={model}
      onChange={(e) => setModel(e.target.value)}
      className="border p-2 rounded"
    >
      <option value="llama-3.1-8b-instant">Fast</option>
      <option value="llama-3.1-70b-versatile">Deep</option>
    </select>
  );
}
