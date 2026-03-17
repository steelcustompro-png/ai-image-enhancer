interface GoogleAccounts {
  id: {
    initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
    prompt: () => void;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

export {};
