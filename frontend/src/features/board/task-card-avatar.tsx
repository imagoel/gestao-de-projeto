import { useState } from "react";

function getInitials(name?: string | null) {
  if (!name) {
    return "--";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

type TaskCardAvatarProps = {
  avatarUrl?: string | null;
  name?: string | null;
};

export function TaskCardAvatar({ avatarUrl, name }: TaskCardAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const initials = getInitials(name);

  if (avatarUrl && !hasImageError) {
    return (
      <img
        alt={name ? `Avatar de ${name}` : "Avatar do responsavel"}
        className="task-card-avatar-image"
        loading="lazy"
        onError={() => setHasImageError(true)}
        src={avatarUrl}
      />
    );
  }

  return <span className="task-card-avatar-fallback">{initials}</span>;
}

