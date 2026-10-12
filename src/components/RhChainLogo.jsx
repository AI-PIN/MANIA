// Official Robinhood Chain logo, used exactly as supplied (Robinhood brand guidelines):
// no recolor/crop/rotation, no other imagery or text inside its clear space, min 20px tall.
// tone: "white" for dark backgrounds, "black" for light ones.
export default function RhChainLogo({ tone = "white", height = 22 }) {
  return (
    <img
      className="rhc-logo"
      src={`/brand/robinhood-chain-logo-${tone}.svg`}
      alt="Robinhood Chain"
      style={{ height: Math.max(20, height), width: "auto" }}
    />
  );
}
