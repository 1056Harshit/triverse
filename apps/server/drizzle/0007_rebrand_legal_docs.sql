-- The app was renamed TriVerse -> PvtFrnd. Clear the seeded legal pages so the server re-seeds them
-- with the new text on boot (they had not been edited yet).
DELETE FROM "legal_docs";
