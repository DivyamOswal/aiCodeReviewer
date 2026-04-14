export default function ModelSwitcher({ model, setModel }) {
  const options = [
    {
      value: "llama-3.1-8b-instant",
      label: "⚡ Fast",
      desc: "Quick responses",
    },
    {
      value: "llama-3.1-70b-versatile",
      label: "🧠 Deep",
      desc: "Better analysis",
    },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-2 flex gap-2 w-fit">
      {options.map((opt) => {
        const active = model === opt.value;

        return (
          <button
            key={opt.value}
            onClick={() => setModel(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm transition-all duration-300 text-left
              ${
                active
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                  : "text-gray-400 hover:bg-white/10"
              }`}
          >
            <div className="font-medium">{opt.label}</div>
            <div className="text-xs opacity-70">{opt.desc}</div>
          </button>
        );
      })}
    </div>
  );
}