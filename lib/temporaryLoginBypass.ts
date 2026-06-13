export const temporaryLoginBypass = false;

export const bypassProfileForRole = (role: 'manager' | 'employee') => ({
  full_name: 'ChemDeck Dev',
  email: role === 'manager' ? 'manager bypass' : 'employee bypass',
  role,
});
