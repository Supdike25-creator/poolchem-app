export const temporaryLoginBypass = true;

export const bypassProfileForRole = (role: 'manager' | 'guard') => ({
  full_name: 'ChemDeck Dev',
  email: role === 'manager' ? 'manager bypass' : 'guard bypass',
  role,
});
