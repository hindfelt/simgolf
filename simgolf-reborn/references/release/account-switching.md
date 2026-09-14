# Shared-computer sign out

Signed-in start menus now show the current player's name and a Sign out action. The Account panel places its existing sign-out action directly below the player name. Both use the existing CSRF-protected server logout endpoint; successful logout broadcasts to other tabs for that account and returns to the root sign-in flow. Account-owned local saves remain intact. Failed requests show an error and restore the controls.

Local unauthenticated development previews say "Local preview · not signed in" and do not offer a misleading logout action. They still use the development browser save, not account-separated profiles. Real account switching requires the account-backed game.

Thirteen account browser checks pass, including two tabs signing out, a second account loading its own saved course, preservation of the first account's save and server failure recovery. These tests mock account HTTP responses; the logout endpoint was not changed. Four local-entry/music checks and the production build also pass. Not deployed.
