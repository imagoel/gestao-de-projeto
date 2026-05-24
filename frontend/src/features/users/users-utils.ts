import type { SectorMembership } from './users-types';

export function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getMembershipLabel(membership: SectorMembership) {
  return `${membership.sector.secretariat.name} > ${membership.sector.name}`;
}
