type AuthAltLinkProps = {
  lead: string;
  action: string;
  onClick: () => void;
};

export function AuthAltLink({ lead, action, onClick }: AuthAltLinkProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 8,
        fontFamily: "var(--brc-font-ui)",
        fontSize: 16,
        color: "var(--brc-text)",
      }}
    >
      <span>{lead}</span>
      <button
        onClick={onClick}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "var(--brc-font-link)",
          fontSize: 16,
          color: "var(--brc-accent)",
          textDecoration: "underline",
          padding: 0,
        }}
      >
        {action}
      </button>
    </div>
  );
}
