const STAFF_ROLES = [
  '1469048464406220972',
  '1469048464330588210',
  '1469048464330588209',
  '1469048464330588208',
  '1469048464330588207',
];

export function hasModPerms(member) {
  return member.roles.cache.some(role =>
    STAFF_ROLES.includes(role.id)
  );
}