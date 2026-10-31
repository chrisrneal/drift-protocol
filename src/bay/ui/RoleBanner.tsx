import type { RoleView } from '../types';
import { SEAT_NAME } from './format';

type RoleBannerProps = {
  view: RoleView;
  ejected: boolean;
};

export function RoleBanner({ view, ejected }: RoleBannerProps) {
  if (ejected) {
    const side = view.role === 'saboteur' ? 'a saboteur' : 'crew';
    return (
      <p className="role-banner">
        You are {side}, and you have been ejected. You stay on the roster. You cannot check in or vote.
      </p>
    );
  }
  if (view.role === 'crew') {
    return (
      <p className="role-banner">
        You are crew. Three seats are saboteurs, and they know each other. You see only your own role.
      </p>
    );
  }
  const partners = view.partners.map((seat) => SEAT_NAME[seat]).join(' and ');
  const plan = view.plan ?? 'not posted';
  return (
    <p className="role-banner saboteur">
      You are a saboteur with {partners}. Cell sign {view.sign === 1 ? '+1' : '\u22121'}. This round&apos;s plan for you:{' '}
      {plan}. The other saboteurs follow the plan. You may ignore it.
    </p>
  );
}
