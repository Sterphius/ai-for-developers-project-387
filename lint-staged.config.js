export default {
  '*.go': () => 'cd server && go vet ./...',
  '*.{ts,tsx}': () => 'cd web && npx tsc --noEmit',
};
