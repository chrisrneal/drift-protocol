import type { RoleView } from '../types';
import { roleBannerText } from './prompt';

type RoleBannerProps = {
  view: RoleView;
  ejected: boolean;
};

export function RoleBanner({ view, ejected }: RoleBannerProps) {
  const saboteur = !ejected && view.role === 'saboteur';
  return <p className={saboteur ? 'role-banner saboteur' : 'role-banner'}>{roleBannerText(view, ejected)}</p>;
}
