import type { Role } from '../game/roles';

type RoleBannerProps = {
  role: Role;
  ejected?: boolean;
};

export function RoleBanner({ role, ejected = false }: RoleBannerProps) {
  const saboteur = role === 'saboteur';
  const text = ejected
    ? 'You are crew, and you have been ejected. You stay on the roster. You cannot transmit or vote.'
    : saboteur
      ? 'You are the saboteur. The others are crew. A quiet edit or a rare drop pulls rescue down. Do not look like the only one breaking the signal.'
      : 'You are crew. One of the other seats is the saboteur. Raise rescue, and after round 1 accuse the seat whose edits and drops stop agreeing.';
  return <p className={saboteur && !ejected ? 'role-banner saboteur' : 'role-banner'}>{text}</p>;
}
